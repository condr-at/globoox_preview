'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface IOSItemsStackProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container-only iOS stack primitive.
 * Owns only clipping/radius rules; row behavior stays in child components.
 */
const IOSItemsStack = React.forwardRef<HTMLDivElement, IOSItemsStackProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('overflow-hidden rounded-xl', className)}>
        {children}
      </div>
    );
  }
);

IOSItemsStack.displayName = 'IOSItemsStack';

export default IOSItemsStack;
