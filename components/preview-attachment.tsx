import type { Attachment } from 'ai';

import { LoaderIcon, CrossSmallIcon, FileIcon } from './icons';
import { Button } from './ui/button';

// Import Dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

// Import react-pdf components
import { Document, Page } from 'react-pdf';

// Utility function to trigger download from data URL
const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div className="flex flex-col gap-2">
      <Dialog>
        <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center mt-2 mr-2 ml-2">
          <DialogTrigger asChild disabled={isUploading || !url}>
            <button
              type="button"
              title={`Preview ${name}`}
              className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md overflow-hidden cursor-pointer"
              disabled={isUploading || !url}
            >
              {contentType ? (
                contentType.startsWith('image/') ? (
                  // NOTE: it is recommended to use next/image for images
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={name ?? 'An image attachment'}
                    className="rounded-md size-full object-cover"
                  />
                ) : contentType === 'application/pdf' ? (
                  // Render PDF thumbnail
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <Document
                      file={url}
                      loading={<LoaderIcon size={16} />}
                      error={<FileIcon size={32} />}
                      className="max-w-full max-h-full flex items-center justify-center"
                    >
                      <Page
                        pageNumber={1}
                        width={80} // Thumbnail width
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    </Document>
                  </div>
                ) : (
                  // Fallback Icon for other types
                  <FileIcon size={32} />
                )
              ) : (
                // Fallback Icon if no content type
                <FileIcon size={32} />
              )}
            </button>
          </DialogTrigger>

          {isUploading && (
            <div className="animate-spin absolute text-zinc-500">
              <LoaderIcon />
            </div>
          )}

          {!isUploading && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-background rounded-full border border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title={`Remove ${name}`}
            >
              <CrossSmallIcon size={12} />
            </Button>
          )}
        </div>
        <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="truncate">{name || 'File Preview'}</DialogTitle>
          </DialogHeader>
          <div className="my-4 flex items-start justify-center max-h-[70vh] overflow-auto pt-4">
            {contentType?.startsWith('image') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={name ?? 'Preview'} className="max-w-full max-h-full object-contain" />
            ) : contentType === 'application/pdf' ? (
              // Render PDF using react-pdf
              <Document
                file={url}
                loading={<LoaderIcon size={24} />}
                error={<p className="text-red-500">Failed to load PDF preview.</p>}
                className="flex justify-center"
              >
                {/* Render only the first page */}
                <Page pageNumber={1} width={550} /> { /* Adjust width as needed */ }
              </Document>
            ) : (
              <p>Cannot display preview for this file type.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
