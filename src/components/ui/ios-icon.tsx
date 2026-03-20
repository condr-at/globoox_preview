'use client';

import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSIconProps extends LucideProps {
  icon: React.ComponentType<LucideProps>;
}

export default function IOSIcon({ icon: Icon, className, strokeWidth = 1.8, ...props }: IOSIconProps) {
  return <Icon className={cn('size-5', className)} strokeWidth={strokeWidth} {...props} />;
}
