import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import fs from 'fs/promises';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size should be less than 10MB',
    })
    .refine((file) => ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.type), {
      message: 'File type should be PDF, JPEG, or PNG',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    console.error('Upload failed: Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    console.error('Upload failed: Empty request body');
    return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      console.error('Upload failed: No file in request');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('Processing file:', {
      type: file.type,
      size: file.size,
      name: (formData.get('file') as File).name
    });

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');
      
      console.error('Upload failed: Validation error -', errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}`;

      // Ensure uploads directory exists with proper permissions
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      console.log('Creating uploads directory:', {
        path: uploadsDir,
        cwd: process.cwd()
      });

      try {
        await mkdir(uploadsDir, { recursive: true, mode: 0o755 });
        console.log('Uploads directory created/verified');
      } catch (mkdirError) {
        console.error('Failed to create uploads directory:', {
          error: mkdirError instanceof Error ? mkdirError.message : 'Unknown error',
          path: uploadsDir
        });
        throw mkdirError;
      }

      // Save file to disk
      const filePath = join(uploadsDir, uniqueFilename);
      console.log('Saving file:', {
        filename: uniqueFilename,
        path: filePath,
        size: buffer.length
      });

      try {
        await writeFile(filePath, buffer);
        
        // Verify file was written
        const stats = await fs.stat(filePath);
        console.log('File saved successfully:', {
          path: filePath,
          size: stats.size,
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid
        });
      } catch (writeError) {
        console.error('Failed to write file:', {
          error: writeError instanceof Error ? writeError.message : 'Unknown error',
          path: filePath
        });
        throw writeError;
      }

      // Create data URL for immediate preview
      const dataURL = `data:${file.type};base64,${buffer.toString('base64')}`;

      // Generate public URL for the file
      const fileUrl = `/uploads/${uniqueFilename}`;

      console.log('File processed successfully:', {
        filename: uniqueFilename,
        type: file.type,
        size: buffer.length,
        path: filePath,
        url: fileUrl
      });

      return NextResponse.json({
        url: dataURL, // For preview
        fileUrl: fileUrl, // Actual file URL
        pathname: fileUrl,
        contentType: file.type,
      });
    } catch (error) {
      console.error('Upload failed: Error processing file -', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to process file'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Upload failed: Unexpected error -', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 },
    );
  }
}
