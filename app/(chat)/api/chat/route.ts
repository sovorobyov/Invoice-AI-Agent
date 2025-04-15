import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText
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

// Import Invoice Processing Tools
import { validateInvoice } from '@/lib/ai/invoice-tools/validate-invoice';
import { extractInvoiceData } from '@/lib/ai/invoice-tools/extract-invoice-data';
import { saveInvoiceToDb } from '@/lib/ai/invoice-tools/save-invoice-to-db';
import { getAllInvoices } from '@/lib/ai/invoice-tools/get-all-invoices';

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userMessage = getMostRecentUserMessage(messages);
  console.log(`[Chat Route] userMessage: `, userMessage);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  // Normalize messages: Ensure content is a string and handle potential 'parts' structure
  const normalizedMessages = messages.map(msg => {
    // If message has 'parts' array (like the logged user message)
    if (msg.role === 'user' && Array.isArray((msg as any).parts) && (msg as any).parts.length > 0) {
      const textPart = (msg as any).parts.find((part: any) => part.type === 'text');
      // Create a new object with content and without parts
      return { ...msg, content: textPart?.text || '', parts: undefined }; 
    }
    // Ensure content exists and is a string for all other messages
    if (typeof msg.content !== 'string') {
      // Handle potential non-string content (maybe from tool results?) - convert to string or skip
      console.warn(`[API /chat] Normalizing non-string content for message ID ${msg.id}`);
      // If content is null/undefined, set to empty string, otherwise try to stringify
      return { ...msg, content: msg.content == null ? '' : JSON.stringify(msg.content) }; 
    }
    return msg; // Keep message as is if content is already a valid string
  }).filter(msg => msg.content.trim() !== ''); // Filter out messages that are now empty

  // Check if normalization resulted in an empty history
  if (normalizedMessages.length === 0) {
    console.error("[API /chat] No valid messages remaining after normalization.");
    return new Response('Cannot process chat with empty message history after normalization.', { status: 400 });
  }

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel }),
        messages: normalizedMessages, // Use the normalized messages
        maxSteps: 5,
        // @ts-ignore - Type definition might be missing for experimental_attachments
        experimental_attachments: messages
          .filter(message => message.role === 'user' && message.experimental_attachments)
          .flatMap(message => message.experimental_attachments || []),
        experimental_activeTools:
          selectedChatModel === 'chat-model-reasoning'
            ? []
            : [
                'validateInvoice',
                'extractInvoiceData',
                'saveInvoiceToDb',
                'getAllInvoices',
              ],
        experimental_transform: smoothStream({ chunking: 'word' }),
        experimental_generateMessageId: generateUUID,
        tools: {
          validateInvoice,
          extractInvoiceData,
          saveInvoiceToDb,
          getAllInvoices,
        },
        onFinish: async (result) => {
          const error = (result as any).error;
          const response = result.response;
          const reasoning = result.reasoning;

          if (error) {
            console.error('[API /chat] Error in streamText onFinish:', error);
          }
          if (session.user?.id && response?.messages) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              const messagesToSave = sanitizedResponseMessages.filter(msg => 
                msg.content !== null && msg.content !== '' && typeof msg.content === 'string'
              );

              if (messagesToSave.length > 0) {
                await saveMessages({
                  messages: messagesToSave.map((message) => {
                    return {
                      id: message.id,
                      chatId: id,
                      role: message.role,
                      content: message.content as string,
                      createdAt: new Date(),
                    };
                  }),
                });
              } else {
                console.warn('[API /chat] onFinish: No valid messages to save after sanitization.');
              }

            } catch (dbError) {
              console.error('[API /chat] onFinish: Failed to save chat messages:', dbError);
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
       console.error('[API /chat] createDataStreamResponse onError:', error);
       return 'An error occurred while processing your request.';
    },
  });
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
