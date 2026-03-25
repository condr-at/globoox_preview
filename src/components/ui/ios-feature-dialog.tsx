'use client';

import IOSDialog from '@/components/ui/ios-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import IOSDialogHeaderCenterLarge from '@/components/ui/ios-dialog-header-center-large';

interface IOSFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}

export default function IOSFeatureDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: IOSFeatureDialogProps) {
  return (
    <IOSDialog
      open={open}
      onOpenChange={onOpenChange}
      className={className ?? 'w-[min(480px,calc(100vw-32px))] max-w-none overflow-hidden rounded-[14px] border-0 bg-[var(--bg-grouped-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-[24px]'}
    >
      <div className="px-6 pb-5 pt-6 text-center">
        <IOSDialogHeaderCenterLarge title={title} description={description} />
        {children ? <div className="pb-0 pt-4 text-left">{children}</div> : null}
      </div>

      <IOSDialogFooter>
        {footer}
      </IOSDialogFooter>
    </IOSDialog>
  );
}
