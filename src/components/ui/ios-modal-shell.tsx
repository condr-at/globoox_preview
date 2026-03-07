'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface IOSModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  wrapperClassName?: string;
  closeOnOverlay?: boolean;
  labelledBy?: string;
  describedBy?: string;
  animationDurationMs?: number;
  contentStyle?: React.CSSProperties | ((state: 'open' | 'closed') => React.CSSProperties);
  overlayStyle?: React.CSSProperties | ((state: 'open' | 'closed') => React.CSSProperties);
}

export default function IOSModalShell({
  open,
  onOpenChange,
  children,
  contentClassName,
  overlayClassName,
  wrapperClassName,
  closeOnOverlay = true,
  labelledBy,
  describedBy,
  animationDurationMs = 280,
  contentStyle,
  overlayStyle,
}: IOSModalShellProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const fallbackLabelId = useId();
  const labelId = labelledBy ?? fallbackLabelId;
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const mountTimeoutId = window.setTimeout(() => {
        setIsMounted(true);
      }, 0);
      return () => window.clearTimeout(mountTimeoutId);
    }

    const hideTimeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, 0);
    const unmountTimeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, animationDurationMs);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(unmountTimeoutId);
    };
  }, [open, animationDurationMs]);

  useEffect(() => {
    if (!isMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (open) {
      const frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
        contentRef.current?.focus();
      });
      return () => {
        window.cancelAnimationFrame(frameId);
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMounted, open, onOpenChange]);

  if (!isMounted || typeof document === 'undefined') return null;

  const state = isVisible ? 'open' : 'closed';
  const resolvedOverlayStyle = typeof overlayStyle === 'function' ? overlayStyle(state) : overlayStyle;
  const resolvedContentStyle = typeof contentStyle === 'function' ? contentStyle(state) : contentStyle;

  return createPortal(
    <div className={cn('fixed inset-0 z-[160]', wrapperClassName)} data-state={state}>
      <button
        type="button"
        aria-label="Close modal"
        className={cn(
          'absolute inset-0 transition-opacity duration-300 ease-out',
          overlayClassName,
        )}
        onClick={closeOnOverlay ? () => onOpenChange(false) : undefined}
        data-state={state}
        style={resolvedOverlayStyle}
      />

      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn('outline-none', contentClassName)}
        data-state={state}
        style={resolvedContentStyle}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
