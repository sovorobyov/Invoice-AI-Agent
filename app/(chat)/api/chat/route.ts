export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
  type Attachment,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { InvoiceProcessor } from '@/lib/services/invoice-processor';
import { join } from 'path';
import fs from 'fs/promises';

// Extend Message type to include attachments
interface MessageWithAttachments extends Message {
  attachments?: Array<Attachment & { 
    fileUrl?: string;
    type?: string;
  }>;
}

// Extend session type with required fields
interface ExtendedSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
  expires?: string;
}

export async function POST(request: Request) {
  try {
    console.log('Received chat request');
    
    const {
      id,
      messages,
      selectedChatModel,
      experimental_attachments,
    }: { 
      id: string; 
      messages: Array<MessageWithAttachments>; 
      selectedChatModel: string;
      experimental_attachments?: Array<Attachment>;
    } = await request.json();

    console.log('Processing chat request:', {
      id,
      selectedChatModel,
      messageCount: messages.length,
      hasAttachments: Boolean(experimental_attachments?.length)
    });

    const session = await auth() as ExtendedSession;

    if (!session || !session.user || !session.user.id) {
      console.error('Chat request unauthorized: No valid session');
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages) as MessageWithAttachments;

    if (!userMessage) {
      console.error('Chat request invalid: No user message found');
      return new Response('No user message found', { status: 400 });
    }

    // Add attachments to the user message if present
    if (experimental_attachments?.length) {
      userMessage.attachments = experimental_attachments;
    }

    // Log message and attachments
    console.log('Processing user message:', {
      content: userMessage.content,
      attachments: userMessage.attachments?.map(a => ({
        url: a.url,
        fileUrl: a.fileUrl,
        type: a.type
      }))
    });

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
      console.log('Created new chat:', { id, title });
    }

    await saveMessages({
      messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        console.log('Starting AI stream processing');
        
        // If the message is about processing an invoice and we have an attachment
        if (
          userMessage.content.toLowerCase().includes('process this invoice') &&
          userMessage.attachments?.[0]
        ) {
          const attachment = userMessage.attachments[0];
          console.log('Found invoice attachment:', attachment);

          try {
            // Create a new instance of InvoiceProcessor and process the invoice
            const fileUrl = attachment.fileUrl || attachment.url;
            const uploadsDir = join(process.cwd(), 'public', 'uploads');
            
            // Log the raw attachment data
            console.log('Raw attachment data:', {
              attachment,
              fileUrl,
              uploadsDir
            });

            // Extract filename correctly - we need to handle the timestamp prefix
            const urlParts = fileUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            console.log('File name parsing:', {
              urlParts,
              extractedFileName: fileName,
              originalFileUrl: fileUrl
            });

            const absoluteFilePath = join(uploadsDir, fileName);
            
            // Enhanced logging for file path debugging
            console.log('Processing invoice file:', {
              fileUrl,
              uploadsDir,
              fileName,
              absoluteFilePath,
              type: attachment.type,
              cwd: process.cwd(),
              publicPath: join(process.cwd(), 'public'),
              originalAttachment: attachment,
              pathSegments: {
                cwd: process.cwd(),
                public: 'public',
                uploads: 'uploads',
                fileName: fileName
              }
            });

            // Check if uploads directory exists
            try {
              const uploadsDirStats = await fs.stat(uploadsDir);
              console.log('Uploads directory status:', {
                exists: uploadsDirStats.isDirectory(),
                path: uploadsDir,
                mode: uploadsDirStats.mode,
                uid: uploadsDirStats.uid,
                gid: uploadsDirStats.gid
              });
            } catch (statError) {
              console.error('Failed to check uploads directory:', {
                error: statError instanceof Error ? statError.message : 'Unknown error',
                path: uploadsDir
              });
            }

            // More robust file existence check with detailed error logging
            let fileExists = false;
            try {
              await fs.access(absoluteFilePath);
              fileExists = true;
              console.log('File exists at path:', absoluteFilePath);
            } catch (accessError) {
              console.error('Failed to access invoice file:', {
                error: accessError instanceof Error ? accessError.message : 'Unknown error',
                stack: accessError instanceof Error ? accessError.stack : undefined,
                fileDetails: {
                  fileUrl,
                  uploadsDir,
                  fileName,
                  absoluteFilePath,
                  type: attachment.type
                },
                paths: {
                  cwd: process.cwd(),
                  publicPath: join(process.cwd(), 'public'),
                  uploadsPath: uploadsDir
                }
              });
              
              // Try to list the contents of the uploads directory for debugging
              try {
                const files = await fs.readdir(uploadsDir);
                console.log('Contents of uploads directory:', {
                  uploadsDir,
                  files,
                  lookingFor: fileName
                });
              } catch (readDirError) {
                console.error('Failed to read uploads directory:', {
                  error: readDirError instanceof Error ? readDirError.message : 'Unknown error',
                  path: uploadsDir
                });
              }
            }

            if (!fileExists) {
              const error = new Error('Invoice file not found');
              error.name = 'FileNotFoundError';
              Object.assign(error, {
                fileDetails: {
                  fileUrl,
                  uploadsDir,
                  fileName,
                  absoluteFilePath,
                  type: attachment.type
                },
                paths: {
                  cwd: process.cwd(),
                  publicPath: join(process.cwd(), 'public'),
                  uploadsPath: uploadsDir
                }
              });
              throw error;
            }

            const processor = new InvoiceProcessor(
              absoluteFilePath,
              fileName,
              attachment.type || 'application/pdf',
              dataStream
            );
            await processor.process();
          } catch (error) {
            console.error('Failed to process invoice:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
              attachment: {
                url: attachment.url,
                fileUrl: attachment.fileUrl,
                type: attachment.type
              }
            });
            throw error; // Re-throw to be handled by onError
          }
          return;
        }

        // Remove attachments from messages to prevent OpenAI SDK errors
        const messagesWithoutAttachments = messages.map(msg => ({
          ...msg,
          attachments: undefined
        }));

        const sessionWithExpiry = {
          ...session,
          expires: new Date().toISOString()
        };

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages: messagesWithoutAttachments,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ 
              session: sessionWithExpiry,
              dataStream 
            }),
            updateDocument: updateDocument({ 
              session: sessionWithExpiry,
              dataStream 
            }),
            requestSuggestions: requestSuggestions({
              session: sessionWithExpiry,
              dataStream,
            }),
          },
          onFinish: async ({ response, reasoning }) => {
            if (session.user?.id) {
              try {
                console.log('AI processing completed, saving messages');
                
                const sanitizedResponseMessages = sanitizeResponseMessages({
                  messages: response.messages,
                  reasoning,
                });

                await saveMessages({
                  messages: sanitizedResponseMessages.map((message) => {
                    return {
                      id: message.id,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    };
                  }),
                });
              } catch (error) {
                console.error('Failed to save chat messages:', error);
                throw error; // Propagate error to be handled by onError
              }
            }
          },
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
          },
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error('Error in chat processing:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error,
          context: {
            messageContent: userMessage.content,
            hasAttachments: Boolean(userMessage.attachments?.length),
            chatId: id,
            selectedModel: selectedChatModel
          }
        });
        
        // Provide more specific error messages to the user
        if (error instanceof Error) {
          // Handle AI SDK specific errors
          if (error.message.includes('functionality not supported')) {
            console.error('AI SDK functionality error:', {
              message: error.message,
              type: error.constructor.name
            });
            return 'This type of file is not supported for direct processing. Please use the "Process this invoice" command instead.';
          }
          
          // Handle file-related errors
          if (error.message.includes('not found')) {
            console.error('File not found error:', {
              message: error.message,
              attachments: userMessage.attachments
            });
            return 'The uploaded file could not be found. Please try uploading it again.';
          }
          
          // Handle PDF parsing errors
          if (error.message.includes('Failed to read or parse')) {
            console.error('PDF parsing error:', {
              message: error.message,
              attachments: userMessage.attachments
            });
            return 'There was an error reading the invoice file. Please ensure it is a valid PDF document.';
          }

          // Handle stream processing errors
          if (error.message.includes('stream') || error.message.includes('AI processing')) {
            console.error('Stream processing error:', {
              message: error.message,
              model: selectedChatModel
            });
            return 'There was an error processing your request. Please try again.';
          }

          // Log unknown errors with full context
          console.error('Unknown error:', {
            message: error.message,
            type: error.constructor.name,
            context: {
              messageContent: userMessage.content,
              attachments: userMessage.attachments,
              model: selectedChatModel
            }
          });
          return `Error: ${error.message}`;
        }

        // Handle non-Error objects
        console.error('Non-error object thrown:', {
          error,
          context: {
            messageContent: userMessage.content,
            hasAttachments: Boolean(userMessage.attachments?.length)
          }
        });
        return 'An unexpected error occurred while processing your request';
      },
    });
  } catch (error) {
    console.error('Unhandled error in chat route:', error);
    return new Response(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
