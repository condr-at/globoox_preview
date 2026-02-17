'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.epub')) {
        setError('Please select an EPUB file');
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
    setMessage('Uploading book file...');
    setError(null);

    const supabase = createClient();

    try {
      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `books/${fileName}`;

      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(storagePath, file, {
          contentType: 'application/epub+zip',
          cacheControl: '3600',
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      setProgress(60);
      setMessage('Creating book record...');

      // Create book record
      const { data: book, error: insertError } = await supabase
        .from('books')
        .insert({
          title: file.name.replace('.epub', '').replace(/_/g, ' '),
          author: 'Unknown',
          file_path: storagePath,
          file_format: 'epub',
          file_size: file.size,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create book: ${insertError.message}`);

      setProgress(100);
      setMessage('Book uploaded successfully!');

      setTimeout(() => {
        onUploaded?.(book.id);
        handleClose();
      }, 1500);
    } catch (err: any) {
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
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
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
