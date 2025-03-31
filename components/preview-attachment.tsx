import type { Attachment } from 'ai';
import { Button } from './ui/button';
import { LoaderIcon, FileIcon, CrossSmallIcon, BoxIcon } from './icons';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PreviewDialog } from './preview-dialog';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onDelete,
  className,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onDelete?: () => void;
  className?: string;
}) => {
  const { name, url, contentType } = attachment;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="relative pt-2 pr-2">
          <div 
            className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center group cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => setIsPreviewOpen(true)}
          >
            {contentType ? (
              contentType.startsWith('image') ? (
                // NOTE: it is recommended to use next/image for images
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt={name ?? 'An image attachment'}
                  className="rounded-md size-full object-cover"
                />
              ) : contentType === 'application/pdf' ? (
                <div className="flex items-center justify-center size-full">
                  <FileIcon />
                </div>
              ) : (
                <div className="flex items-center justify-center size-full">
                  <FileIcon />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center size-full">
                <FileIcon />
              </div>
            )}

            {isUploading && (
              <div className="animate-spin absolute text-zinc-500">
                <LoaderIcon />
              </div>
            )}

            {!isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <BoxIcon size={16} />
              </div>
            )}

            {onDelete && !isUploading && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 size-5 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <CrossSmallIcon />
                <span className="sr-only">Remove file</span>
              </Button>
            )}
          </div>
          <div className="text-xs text-zinc-500 max-w-16 truncate mt-2">{name}</div>
        </div>
      </div>

      <PreviewDialog
        attachment={attachment}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
};
