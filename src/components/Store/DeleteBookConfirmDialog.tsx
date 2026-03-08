'use client';

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
    />
  );
}
