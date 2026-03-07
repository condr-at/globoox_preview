'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
import IOSDialog from '@/components/ui/ios-dialog';
import { getSignedUploadUrl, uploadToStorage, processBook } from '@/lib/api';
import { trackBookUploadStarted, trackBookUploaded, trackBookUploadFailed } from '@/lib/posthog';
import * as Sentry from '@sentry/nextjs';

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (bookId: string) => void;
}

const SUPPORT_EMAIL = 'support@globoox.co'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function createUploadFileName(originalName: string): string {
  const slug = originalName
    .replace(/\.epub$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  return `${slug}-${uniqueSuffix}.epub`
}

function getUploadHelp(error: string | null) {
  if (!error) return null

  const normalized = error.toLowerCase()

  if (normalized.includes('please select an epub file')) {
    return {
      title: 'This file does not look like a valid EPUB.',
      tips: [
        'Make sure the file ends in .epub.',
        'If it opens in another reading app, export it again as EPUB and retry.',
        'DRM-protected books usually cannot be imported.',
      ],
    }
  }

  if (normalized.includes('storage upload failed') || normalized.includes('network') || normalized.includes('failed to fetch')) {
    return {
      title: 'The upload did not finish.',
      tips: [
        'Check your connection and try again.',
        'If the file is very large, wait a moment before retrying.',
        `If this keeps happening, contact ${SUPPORT_EMAIL}.`,
      ],
    }
  }

  return {
    title: 'This book may use an EPUB format we cannot read cleanly yet.',
    tips: [
      'Try opening the file in another EPUB reader to confirm it works.',
      'If possible, re-export it as EPUB 2 or EPUB 3 and upload it again.',
      `If you want us to look into it, contact ${SUPPORT_EMAIL}.`,
    ],
  }
}

export default function UploadBookModal({ isOpen, onClose, onUploaded }: UploadBookModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadHelp = getUploadHelp(error)

  const isLikelyEpub = async (selectedFile: File): Promise<boolean> => {
    const normalizedName = selectedFile.name.trim().toLowerCase();
    if (normalizedName.endsWith('.epub')) return true;

    const mime = (selectedFile.type || '').toLowerCase();
    if (mime === 'application/epub+zip') return true;

    try {
      const head = await selectedFile.slice(0, 1024).arrayBuffer();
      const bytes = new Uint8Array(head);
      const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
      if (!isZip) return false;
      const text = new TextDecoder('latin1').decode(bytes).toLowerCase();
      if (text.includes('mimetypeapplication/epub+zip')) return true;
      console.warn('[upload] EPUB header not found in first 1KB, treating as ZIP fallback');
      return true;
    } catch {
      return false;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const valid = await isLikelyEpub(selectedFile);
      if (!valid) {
        setError('Please select an EPUB file');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setMessage('Preparing upload…');
    setError(null);

    const fileSizeKb = Math.round(file.size / 1024);
    trackBookUploadStarted({ file_size_kb: fileSizeKb });

    try {
      Sentry.addBreadcrumb({
        category: 'upload',
        message: 'upload.started',
        data: { fileName: file.name, fileSize: file.size },
        level: 'info',
      });

      // Generate unique file path
      const fileName = createUploadFileName(file.name);

      // Step 1: Get signed URL for direct upload
      setProgress(15);
      setMessage('Getting upload URL…');
      const { signedUrl } = await getSignedUploadUrl('books', fileName);

      // Step 2: Upload directly to Supabase Storage (bypasses server limits)
      setProgress(25);
      setMessage('Uploading book…');
      await uploadToStorage(signedUrl, file, 'application/epub+zip');

      // Step 3: Process the book on the server
      setProgress(50);
      setMessage('Processing book…');
      const response = await processBook(fileName, file.name, file.size);

      // Success
      trackBookUploaded({
        title: file.name,
        author: 'Unknown',
        language: 'unknown',
        chapter_count: response.chapter_count ?? 0,
        file_size_kb: fileSizeKb,
      });

      Sentry.addBreadcrumb({ category: 'upload', message: 'upload.success', data: { bookId: response.id }, level: 'info' });
      setProgress(100);
      setMessage('Book uploaded successfully!');

      setTimeout(() => { onUploaded?.(response.id); handleClose() }, 1500);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Upload failed')
      console.error('Upload error:', err);
      Sentry.captureException(err, {
        contexts: { upload: { fileName: file.name, fileSize: file.size, fileSizeKb } },
      });
      trackBookUploadFailed({ error: message, file_size_kb: fileSizeKb });
      setError(message);
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <IOSDialog
      open={isOpen}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      className="bg-card sm:max-w-md"
      mobileLayout="sheet"
    >
      <div className="relative p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4">Upload Book</h2>

        {!uploading ? (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {file ? (
                <FileText className="w-10 h-10 mx-auto mb-3 text-primary" />
              ) : (
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to select an EPUB file'}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                {uploadHelp && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-left">
                    <p className="text-sm font-medium">{uploadHelp.title}</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {uploadHelp.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file}
              className="w-full mt-4 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Upload
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            {progress < 100 ? (
              <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-primary" />
            ) : (
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
            )}
            <p className="text-sm text-muted-foreground mb-3">{message}</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </IOSDialog>
  );
}
