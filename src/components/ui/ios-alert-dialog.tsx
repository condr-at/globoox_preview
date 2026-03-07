'use client';

import { useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import IOSDialog from '@/components/ui/ios-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IOSAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  destructive?: boolean;
  loading?: boolean;
  showCancel?: boolean;
  icon?: React.ReactNode;
}

export default function IOSAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  loading = false,
  showCancel = false,
  icon,
}: IOSAlertDialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <IOSDialog
      open={open}
      onOpenChange={onOpenChange}
      labelledBy={titleId}
      describedBy={descriptionId}
      closeOnOverlay={!loading}
      className="max-w-[min(92vw,360px)] overflow-hidden"
    >
      <div className="px-6 pb-4 pt-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--fill-secondary)] text-[var(--system-blue)]">
          {icon ?? <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />}
        </div>
        <h2
          id={titleId}
          className="text-[22px] font-semibold tracking-[-0.02em] text-foreground"
        >
          {title}
        </h2>
        <div
          id={descriptionId}
          className="mt-2 text-sm leading-6 text-muted-foreground"
        >
          {description}
        </div>
      </div>

      <div className="border-t border-[var(--separator)] bg-[var(--bg-secondary)] p-3">
        <div className={cn('flex gap-3', !showCancel && 'justify-center')}>
          {showCancel && (
            <Button
              type="button"
              variant="secondary"
              className="h-12 flex-1 rounded-[18px] bg-[var(--fill-secondary)] text-foreground hover:bg-[var(--fill-primary)]"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            className={cn(
              'h-12 rounded-[18px]',
              showCancel ? 'flex-1' : 'min-w-32 px-8',
              destructive
                ? 'bg-[var(--system-red)] text-white hover:bg-[color-mix(in_srgb,var(--system-red)_88%,black)]'
                : 'bg-[var(--system-blue)] text-white hover:bg-[color-mix(in_srgb,var(--system-blue)_88%,black)]',
            )}
            onClick={onConfirm ?? (() => onOpenChange(false))}
            disabled={loading}
          >
            {loading
              ? destructive
                ? 'Deleting...'
                : 'Loading...'
              : confirmLabel}
          </Button>
        </div>
      </div>
    </IOSDialog>
  );
}
