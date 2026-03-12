'use client';

import { IOSActionGroup } from '@/components/ui/ios-action-group';

interface IOSDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export default function IOSDialogFooter({ children, className }: IOSDialogFooterProps) {
  return <IOSActionGroup className={className}>{children}</IOSActionGroup>;
}
