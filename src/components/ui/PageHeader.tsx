'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type PageHeaderAction = {
  label: string;
  onClick: () => void;
};

type PageHeaderProps = {
  title: string;
  collapseThreshold?: number;
  expandDelta?: number;
  action?: PageHeaderAction;
  children?: ReactNode;
};

export default function PageHeader({
  title,
  collapseThreshold = 60,
  expandDelta = 60,
  action,
  children,
}: PageHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isCollapsedRef = useRef(false);
  const lastYRef = useRef(0);
  const collapseAnchorYRef = useRef(0);

  useEffect(() => {
    const setCollapsedState = (next: boolean) => {
      if (isCollapsedRef.current === next) return;
      isCollapsedRef.current = next;
      setIsCollapsed(next);
    };

    const onScroll = () => {
      const y = Math.max(window.scrollY, 0);
      const lastY = lastYRef.current;
      const isScrollingUp = y < lastY;
      const isScrollingDown = y > lastY;
      const collapsed = isCollapsedRef.current;

      if (y <= collapseThreshold) {
        setCollapsedState(false);
        collapseAnchorYRef.current = y;
      } else if (!collapsed) {
        if (isScrollingDown && y > collapseThreshold) {
          setCollapsedState(true);
          collapseAnchorYRef.current = y;
        }
      } else if (isScrollingUp) {
        if (collapseAnchorYRef.current - y >= expandDelta) {
          setCollapsedState(false);
          collapseAnchorYRef.current = y;
        }
      } else if (isScrollingDown) {
        collapseAnchorYRef.current = y;
      }

      lastYRef.current = y;
    };

    const initialY = Math.max(window.scrollY, 0);
    lastYRef.current = initialY;
    collapseAnchorYRef.current = initialY;
    isCollapsedRef.current = initialY > collapseThreshold;
    setIsCollapsed(isCollapsedRef.current);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [collapseThreshold, expandDelta]);

  const paddingTop = isCollapsed ? 8 : 16;
  const paddingBottom = isCollapsed ? 8 : 16;

  return (
    <header className="pt-[env(safe-area-inset-top)] fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b">
      <div
        className="container max-w-2xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 transition-[padding] duration-300 ease-in-out"
        style={{ paddingTop, paddingBottom }}
      >
        <h1
          className={[
            'font-medium transition-[font-size,line-height] duration-300 ease-in-out',
            '-mt-1',
            isCollapsed ? 'text-base' : 'text-2xl',
          ].join(' ')}
        >
          {title}
        </h1>

        <div className="min-w-[44px] h-9 flex items-center justify-end">
          {action ? (
            <button
              onClick={action.onClick}
              className="h-9 text-[15px] font-medium text-[var(--system-blue)] active:opacity-50 transition-[opacity,transform] duration-300 ease-in-out px-2"
              style={{
                opacity: isCollapsed ? 0 : 1,
                transform: isCollapsed ? 'scale(0)' : 'scale(1)',
                transformOrigin: 'right center',
                pointerEvents: isCollapsed ? 'none' : 'auto',
              }}
              tabIndex={isCollapsed ? -1 : 0}
            >
              {action.label}
            </button>
          ) : (
            <div className="h-9 w-[44px]" aria-hidden="true" />
          )}
        </div>
      </div>

      {!isCollapsed && children && (
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 pb-4 space-y-3">
          {children}
        </div>
      )}
    </header>
  );
}
