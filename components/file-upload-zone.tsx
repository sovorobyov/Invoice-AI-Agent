import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Attachment } from 'ai';

interface FileUploadZoneProps {
  onFileUpload: (attachments: Attachment[]) => void;
  className?: string;
}

export function FileUploadZone({ onFileUpload, className }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const { url, pathname, contentType } = data;
        return { url, name: pathname, contentType };
      }
      
      toast.error(data.error || 'Failed to upload file');
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file, please try again!');
      return null;
    }
  };

  const validateFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and image files (PNG, JPG) are allowed');
      return false;
    }

    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return false;
    }

    return true;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      toast.error('Please upload only one file at a time');
      return;
    }

    const file = files[0];
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      const attachment = await uploadFile(file);
      if (attachment) {
        onFileUpload([attachment]);
        toast.success('File uploaded successfully');
      }
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.onchange = (e) => handleFiles((e.target as HTMLInputElement).files);
    input.click();
  }, [handleFiles]);

  return (
    <div
      className={cn(
        'w-full h-24 border-2 border-dashed rounded-lg transition-colors cursor-pointer',
        isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700',
        isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isUploading ? undefined : handleClick}
    >
      <div className="flex flex-col items-center justify-center h-full text-sm">
        {isUploading ? (
          <p className="text-gray-500">Uploading...</p>
        ) : (
          <>
            <p className="text-gray-500">Drag and drop an invoice file here, or click to select</p>
            <p className="text-gray-400 text-xs mt-1">Supported formats: PDF, PNG, JPG (max 10MB)</p>
          </>
        )}
      </div>
    </div>
  );
} 