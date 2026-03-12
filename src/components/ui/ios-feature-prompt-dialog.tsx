'use client';

import IOSDialog from '@/components/ui/ios-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import IOSFeaturePromptHeader from '@/components/ui/ios-feature-prompt-header';

interface IOSFeaturePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}

export default function IOSFeaturePromptDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: IOSFeaturePromptDialogProps) {
  return (
    <IOSDialog
      open={open}
      onOpenChange={onOpenChange}
      className={className ?? 'w-[min(480px,calc(100vw-32px))] max-w-none overflow-hidden rounded-[14px] border-0 bg-[rgba(242,242,247,0.82)] shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-[24px] dark:bg-[rgba(28,28,30,0.88)]'}
    >
      <div className="px-6 pb-5 pt-6 text-center">
        <IOSFeaturePromptHeader title={title} description={description} />
        {children ? <div className="pb-0 pt-4 text-left">{children}</div> : null}
      </div>

      <IOSDialogFooter>
        {footer}
      </IOSDialogFooter>
    </IOSDialog>
  );
}
