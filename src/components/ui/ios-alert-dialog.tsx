'use client';

import { useId } from 'react';
import {
  IOSAction,
  IOSActionDivider,
  IOSActionRow,
  IOSActionStack,
  IOSActionVerticalDivider,
} from '@/components/ui/ios-action-group';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
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
  actionsLayout?: 'horizontal' | 'vertical';
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
  actionsLayout = 'horizontal',
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
      className="w-[min(320px,calc(100vw-32px))] max-w-none overflow-hidden rounded-[14px] border-0 bg-[var(--bg-grouped-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-[24px] sm:max-w-none sm:rounded-[14px]"
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
          className="text-[17px] font-semibold leading-[22px] tracking-[-0.01em] text-foreground"
        >
          {title}
        </h2>
        <div
          id={descriptionId}
          className="mt-3 text-[13px] leading-[18px] text-foreground"
        >
          {description}
        </div>
      </div>

      <IOSDialogFooter>
        {showCancel ? (
          actionsLayout === 'vertical' ? (
            <IOSActionStack>
              <IOSAction onClick={() => onOpenChange(false)} disabled={loading}>
                {cancelLabel}
              </IOSAction>
              <IOSActionDivider />
              <IOSAction
                onClick={onConfirm ?? (() => onOpenChange(false))}
                disabled={loading}
                destructive={destructive}
              >
                {loading
                  ? destructive
                    ? 'Deleting...'
                    : 'Loading...'
                  : confirmLabel}
              </IOSAction>
            </IOSActionStack>
          ) : (
            <IOSActionRow>
              <IOSAction onClick={() => onOpenChange(false)} disabled={loading}>
                {cancelLabel}
              </IOSAction>
              <IOSActionVerticalDivider />
              <IOSAction
                onClick={onConfirm ?? (() => onOpenChange(false))}
                disabled={loading}
                destructive={destructive}
              >
                {loading
                  ? destructive
                    ? 'Deleting...'
                    : 'Loading...'
                  : confirmLabel}
              </IOSAction>
            </IOSActionRow>
          )
        ) : (
          <IOSActionStack>
            <IOSAction
              onClick={onConfirm ?? (() => onOpenChange(false))}
              disabled={loading}
              destructive={destructive}
              emphasized
            >
              {loading
                ? destructive
                  ? 'Deleting...'
                  : 'Loading...'
                : confirmLabel}
            </IOSAction>
          </IOSActionStack>
        )}
      </IOSDialogFooter>
    </IOSDialog>
  );
}
