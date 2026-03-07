'use client';

import { useId } from 'react';
import IOSDialog from '@/components/ui/ios-dialog';
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
  const hasIcon = Boolean(icon);

  return (
    <IOSDialog
      open={open}
      onOpenChange={onOpenChange}
      labelledBy={titleId}
      describedBy={descriptionId}
      closeOnOverlay={!loading}
      className="max-w-[270px] overflow-hidden rounded-[14px] border-0 bg-[rgba(242,242,247,0.82)] shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-[24px] dark:bg-[rgba(28,28,30,0.88)]"
    >
      <div className="px-[16px] pt-3 text-center" style={{ paddingBottom: '18px' }}>
        <div
          aria-hidden={!hasIcon}
          className={cn(
            'mx-auto mb-[10px] flex h-0 items-center justify-center overflow-hidden opacity-0',
            hasIcon && 'h-10 opacity-100',
          )}
        >
          {icon}
        </div>
        <h2
          id={titleId}
          className="text-[17px] font-semibold leading-[22px] tracking-[-0.01em] text-[var(--label-primary)]"
        >
          {title}
        </h2>
        <div
          id={descriptionId}
          className="mt-3 text-[13px] leading-[18px] text-[var(--label-primary)]"
        >
          {description}
        </div>
      </div>

      <div
        className={cn(
          'border-t border-[rgba(60,60,67,0.18)] dark:border-[rgba(84,84,88,0.36)]',
          showCancel ? 'grid grid-cols-2' : 'grid grid-cols-1',
        )}
      >
        {showCancel && (
          <button
            type="button"
            className="flex h-[44px] items-center justify-center text-[17px] font-normal text-[var(--system-blue)] transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.06]"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          className={cn(
            'flex h-[44px] items-center justify-center text-[17px] transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.06]',
            showCancel && 'border-l border-[rgba(60,60,67,0.18)] dark:border-[rgba(84,84,88,0.36)]',
            destructive
              ? 'font-normal text-[var(--system-red)]'
              : 'font-normal text-[var(--system-blue)]',
          )}
          onClick={onConfirm ?? (() => onOpenChange(false))}
          disabled={loading}
        >
          {loading
            ? destructive
              ? 'Deleting...'
              : 'Loading...'
            : confirmLabel}
        </button>
      </div>
    </IOSDialog>
  );
}
