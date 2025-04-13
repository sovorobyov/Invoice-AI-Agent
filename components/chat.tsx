'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';

import { Block } from './block';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useBlockSelector } from '@/hooks/use-block';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { PaperclipIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
}) {
  const { mutate } = useSWRConfig();
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: (error) => {
      toast.error('An error occured, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isBlockVisible = useBlockSelector((state) => state.isVisible);

  const uploadFile = useCallback(async (file: File): Promise<Attachment | undefined> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;
        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error || 'Failed to upload file.');
    } catch (error) {
      console.error('Upload fetch error:', error);
      toast.error('Failed to upload file, please try again!');
    }
    return undefined;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (attachments.length > 0 || uploadQueue.length > 0) {
        toast.error('Cannot upload another file while one is attached or uploading.');
        return;
      }
      if (files.length > 1) {
        toast.error('Only one file can be uploaded at a time.');
        return;
      }

      const file = files[0];
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.type}. Only PDF, PNG, JPG allowed.`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`File size exceeds 10MB limit (${(file.size / (1024*1024)).toFixed(2)}MB).`);
        return;
      }

      setUploadQueue([file.name]);
      uploadFile(file)
        .then((uploadedAttachment) => {
          if (uploadedAttachment) {
            setAttachments([uploadedAttachment]);
          }
        })
        .catch((error) => console.error('Upload process error:', error))
        .finally(() => setUploadQueue([]));
    },
    [attachments, uploadQueue, setAttachments, uploadFile],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      if (event.target) event.target.value = '';
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (dropzoneRef.current && !dropzoneRef.current.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeAttachment = useCallback((urlToRemove: string) => {
    setAttachments((prev) => prev.filter(att => att.url !== urlToRemove));
  }, [setAttachments]);

  return (
    <>
      <div
        ref={dropzoneRef}
        className="relative flex flex-col min-w-0 h-dvh bg-background"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={false}
        />

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={false}
          isBlockVisible={isBlockVisible}
        />

        <div className="mt-auto sticky bottom-0 inset-x-0 flex justify-center bg-background z-10">
          <form className="relative flex flex-col mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
            <div className="absolute bottom-[calc(1rem+2px)] left-4 mb-4 md:mb-6 z-20">
              <Button
                className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
                onClick={(event) => {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
                disabled={isLoading || attachments.length > 0 || uploadQueue.length > 0}
                variant="ghost"
                title="Attach file (PDF, PNG, JPG - max 10MB)"
              >
                <PaperclipIcon size={14} />
              </Button>
            </div>

            {/* Render Attachment Previews */}
            {(attachments.length > 0 || uploadQueue.length > 0) && (
              <div className="flex flex-row gap-2 overflow-x-scroll items-end mb-2">
                {attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                    onRemove={() => removeAttachment(attachment.url)}
                  />
                ))}

                {uploadQueue.map((filename) => (
                  <PreviewAttachment
                    key={filename}
                    attachment={{
                      url: '',
                      name: filename,
                      contentType: '',
                    }}
                    isUploading={true}
                  />
                ))}
              </div>
            )}

            <MultimodalInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              uploadQueue={uploadQueue}
              onFileChange={handleFileChange}
              fileInputRef={fileInputRef}
            />
          </form>
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-90 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center pointer-events-none z-50">
            <span className="text-white font-semibold text-lg p-4 bg-black bg-opacity-30 rounded">Drop invoice here (PDF, PNG, JPG - max 10MB)</span>
          </div>
        )}
      </div>

      <Block
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={false}
      />
    </>
  );
}
