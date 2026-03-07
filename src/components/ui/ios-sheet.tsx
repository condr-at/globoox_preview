'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import IOSModalShell from '@/components/ui/ios-modal-shell';

interface IOSSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  side?: 'bottom' | 'left' | 'right';
  labelledBy?: string;
  describedBy?: string;
  dragHandle?: React.ReactNode;
  enableDragDismiss?: boolean;
}

const sideClassName: Record<NonNullable<IOSSheetProps['side']>, string> = {
  bottom: 'relative mt-auto w-full rounded-t-[30px] border border-[var(--separator)] bg-[var(--bg-grouped-secondary)] shadow-2xl sm:mt-0 sm:max-w-lg sm:rounded-[28px] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-0',
  left: 'relative h-full w-[min(88vw,360px)] border-r border-[var(--separator)] bg-[var(--bg-grouped-secondary)] shadow-2xl',
  right: 'relative ml-auto h-full w-[min(88vw,420px)] border-l border-[var(--separator)] bg-[var(--bg-grouped-secondary)] shadow-2xl',
};

const wrapperClassName: Record<NonNullable<IOSSheetProps['side']>, string> = {
  bottom: 'flex items-end justify-center sm:items-center sm:p-4',
  left: 'flex items-stretch justify-start',
  right: 'flex items-stretch justify-end',
};

const sideOpenTransform: Record<NonNullable<IOSSheetProps['side']>, string> = {
  bottom: 'translate3d(0, 0, 0)',
  left: 'translate3d(0, 0, 0)',
  right: 'translate3d(0, 0, 0)',
};

const sideClosedTransform: Record<NonNullable<IOSSheetProps['side']>, string> = {
  bottom: 'translate3d(0, 100%, 0)',
  left: 'translate3d(-100%, 0, 0)',
  right: 'translate3d(100%, 0, 0)',
};

export default function IOSSheet({
  open,
  onOpenChange,
  children,
  className,
  side = 'bottom',
  labelledBy,
  describedBy,
  dragHandle,
  enableDragDismiss = false,
}: IOSSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);

  const canDrag = enableDragDismiss && side === 'bottom';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    pointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    setIsDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag || !isDragging || pointerIdRef.current !== event.pointerId) return;
    const nextOffset = Math.max(0, event.clientY - startYRef.current);
    setDragOffset(nextOffset);
  };

  const finishDrag = (pointerId: number) => {
    if (!canDrag || pointerIdRef.current !== pointerId) return;
    const shouldClose = dragOffset > 120;
    pointerIdRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    if (shouldClose) onOpenChange(false);
  };

  const shouldDisableSlide = isDesktop && side === 'bottom';

  return (
    <IOSModalShell
      open={open}
      onOpenChange={onOpenChange}
      labelledBy={labelledBy}
      describedBy={describedBy}
      wrapperClassName={wrapperClassName[side]}
      overlayClassName="bg-black/24"
      contentClassName={cn(sideClassName[side], className)}
      overlayStyle={(state) => ({
        opacity: state === 'open' ? 1 : 0,
        transition: 'opacity 240ms ease-out',
      })}
      contentStyle={(state) => ({
        transform: shouldDisableSlide
          ? 'translate3d(0, 0, 0)'
          : side === 'bottom' && state === 'open'
            ? `translate3d(0, ${dragOffset}px, 0)`
            : state === 'open'
              ? sideOpenTransform[side]
              : sideClosedTransform[side],
        transition: isDragging
          ? 'none'
          : shouldDisableSlide
            ? 'opacity 180ms ease-out'
          : state === 'open'
            ? 'transform 320ms cubic-bezier(0.22, 0.78, 0, 1)'
            : 'transform 240ms cubic-bezier(0.4, 0, 1, 1)',
        opacity: shouldDisableSlide ? (state === 'open' ? 1 : 0) : 1,
        willChange: shouldDisableSlide ? 'opacity' : 'transform',
      })}
    >
      {canDrag && dragHandle ? (
        <>
          <div className={cn(
            'absolute inset-x-0 top-0 z-20',
            shouldDisableSlide ? 'hidden' : 'block',
          )}>
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => finishDrag(event.pointerId)}
              onPointerCancel={(event) => finishDrag(event.pointerId)}
              className="touch-none h-10"
            >
              <div className="flex justify-center pt-2">
                {dragHandle}
              </div>
            </div>
          </div>
          {children}
        </>
      ) : (
        children
      )}
    </IOSModalShell>
  );
}
