'use client';

import { cn } from '@/lib/utils';
import IOSModalShell from '@/components/ui/ios-modal-shell';

interface IOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  closeOnOverlay?: boolean;
  mobileLayout?: 'centered' | 'sheet';
}

export default function IOSDialog({
  open,
  onOpenChange,
  children,
  className,
  labelledBy,
  describedBy,
  closeOnOverlay = true,
  mobileLayout = 'centered',
}: IOSDialogProps) {
  return (
    <IOSModalShell
      open={open}
      onOpenChange={onOpenChange}
      labelledBy={labelledBy}
      describedBy={describedBy}
      closeOnOverlay={closeOnOverlay}
      overlayClassName={mobileLayout === 'sheet' ? 'bg-black/24' : 'bg-black/45 backdrop-blur-md'}
      overlayStyle={(state) => ({
        opacity: state === 'open' ? 1 : 0,
        transition: 'opacity 220ms ease-out',
      })}
      wrapperClassName={cn(
        'flex justify-center sm:items-center sm:p-4',
        mobileLayout === 'sheet' ? 'items-end p-0' : 'items-center p-4',
      )}
      contentClassName={cn(
        'relative w-full border border-[var(--separator)] bg-[var(--bg-grouped-secondary)] shadow-2xl sm:max-w-md sm:rounded-[28px] sm:pb-0',
        mobileLayout === 'sheet'
          ? 'rounded-t-[30px] pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
          : 'max-w-md rounded-[28px] pb-0',
        className,
      )}
      contentStyle={(state) => mobileLayout === 'sheet'
        ? {
            transform: state === 'open' ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100%, 0)',
            transition: state === 'open'
              ? 'transform 320ms cubic-bezier(0.22, 0.78, 0, 1)'
              : 'transform 240ms cubic-bezier(0.4, 0, 1, 1)',
            willChange: 'transform',
          }
        : {
            transform: state === 'open' ? 'scale(1)' : 'scale(0.98)',
            opacity: state === 'open' ? 1 : 0,
            transition: state === 'open'
              ? 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease-out'
              : 'transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 180ms ease-in',
            willChange: 'transform, opacity',
          }}
    >
      {children}
    </IOSModalShell>
  );
}
