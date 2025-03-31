import { Dialog } from '@/components/ui/dialog';
import { DialogPortal, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Attachment } from 'ai';
import { FileIcon } from './icons';
import { Cross2Icon } from '@radix-ui/react-icons';
import { forwardRef } from 'react';

// Custom DialogContent without the default close button
const PreviewDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
PreviewDialogContent.displayName = "PreviewDialogContent";

interface PreviewDialogProps {
  attachment: Attachment;
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewDialog({ attachment, isOpen, onClose }: PreviewDialogProps) {
  const { url, contentType, name } = attachment;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <PreviewDialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col w-full h-full">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
            <DialogTitle className="text-sm font-medium truncate">
              {name || 'File Preview'}
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          
          <div className="relative w-full h-full flex items-center justify-center bg-muted rounded-b-lg">
            {contentType?.startsWith('image') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={name ?? 'Preview'}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : contentType === 'application/pdf' ? (
              <iframe
                src={url}
                title={name ?? 'PDF Preview'}
                className="w-full h-[80vh] border-0"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-8">
                <FileIcon />
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type
                </p>
              </div>
            )}
          </div>
        </div>
      </PreviewDialogContent>
    </Dialog>
  );
} 