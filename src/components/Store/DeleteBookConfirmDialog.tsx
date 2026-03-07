'use client';

import { AlertTriangle } from 'lucide-react';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';

interface DeleteBookConfirmDialogProps {
  open: boolean;
  title: string;
  deleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteBookConfirmDialog({
  open,
  title,
  deleting = false,
  onConfirm,
  onCancel,
}: DeleteBookConfirmDialogProps) {
  return (
    <IOSAlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleting) onCancel();
      }}
      title="Delete Book?"
      description={(
        <>
          <span className="font-medium text-foreground">{title}</span> will be removed from your library.
          This action cannot be undone.
        </>
      )}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      destructive
      loading={deleting}
      showCancel
      icon={(
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--system-red)_14%,transparent)] text-[var(--system-red)]">
          <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />
        </div>
      )}
    />
  );
}
