'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
import { uploadBook } from '@/lib/api';
import { trackBookUploadStarted, trackBookUploaded, trackBookUploadFailed } from '@/lib/posthog';
import * as Sentry from '@sentry/nextjs';

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (bookId: string) => void;
}

export default function UploadBookModal({ isOpen, onClose, onUploaded }: UploadBookModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isLikelyEpub = async (selectedFile: File): Promise<boolean> => {
    const normalizedName = selectedFile.name.trim().toLowerCase();
    if (normalizedName.endsWith('.epub')) return true;

    const mime = (selectedFile.type || '').toLowerCase();
    if (mime === 'application/epub+zip') return true;

    // Fallback for browsers that provide weak/empty MIME metadata.
    // EPUB is a ZIP; by spec it contains "mimetypeapplication/epub+zip" near the beginning.
    try {
      const head = await selectedFile.slice(0, 1024).arrayBuffer();
      const bytes = new Uint8Array(head);
      const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
      if (!isZip) return false;
      const text = new TextDecoder('latin1').decode(bytes).toLowerCase();
      // Some EPUB generators place the mimetype record deeper than the first 1KB.
      if (text.includes('mimetypeapplication/epub+zip')) return true;
      // Loosen check: any ZIP that isn't clearly something else is allowed and will be verified by the parser later.
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
    setMessage('Uploading book...');
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

      setProgress(30);

      const formData = new FormData();
      formData.append('epub', file);

      const book = await uploadBook(formData);

      trackBookUploaded({
        title: book.title || file.name,
        author: book.author || 'Unknown',
        language: book.original_language ?? 'unknown',
        chapter_count: book.chapter_count ?? 0,
        file_size_kb: fileSizeKb,
      });

      Sentry.addBreadcrumb({
        category: 'upload',
        message: 'upload.success',
        data: { bookId: book.id },
        level: 'info',
      });

      setProgress(100);
      setMessage('Book uploaded successfully!');

      setTimeout(() => {
        onUploaded?.(book.id);
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      Sentry.captureException(err, {
        contexts: { upload: { fileName: file.name, fileSize: file.size, fileSizeKb } },
      });
      trackBookUploadFailed({ error: err.message || 'Upload failed', file_size_kb: fileSizeKb });
      setError(err.message || 'Upload failed');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
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
              <p className="text-sm text-destructive mt-3">{error}</p>
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
    </div>
  );
}
