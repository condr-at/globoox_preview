'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface IOSActionGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface IOSActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  emphasized?: boolean;
  className?: string;
}

interface IOSActionLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  emphasized?: boolean;
  className?: string;
}

function getActionClassName({
  destructive,
  emphasized,
  className,
}: {
  destructive?: boolean;
  emphasized?: boolean;
  className?: string;
}) {
  return cn(
    'flex h-[56px] w-full items-center justify-center px-4 text-center text-[17px] transition-colors active:bg-black/[0.04] disabled:opacity-50 dark:active:bg-white/[0.06]',
    destructive
      ? 'font-normal text-[var(--system-red)]'
      : emphasized
        ? 'font-normal text-[var(--system-blue)] sm:font-medium dark:font-normal'
        : 'font-normal text-[var(--system-blue)]',
    className,
  );
}

export function IOSActionGroup({ children, className }: IOSActionGroupProps) {
  return (
    <div
      className={cn(
        'overflow-hidden border-t border-[rgba(60,60,67,0.18)] dark:border-[rgba(84,84,88,0.36)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function IOSActionStack({ children, className }: IOSActionGroupProps) {
  return (
    <div className={cn('grid grid-cols-1', className)}>
      {children}
    </div>
  );
}

export function IOSActionRow({ children, className }: IOSActionGroupProps) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]', className)}>
      {children}
    </div>
  );
}

export function IOSActionDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-px bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.36)]',
        className,
      )}
    />
  );
}

export function IOSActionVerticalDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-px self-stretch bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.36)]',
        className,
      )}
    />
  );
}

export function IOSAction({
  children,
  onClick,
  disabled = false,
  destructive = false,
  emphasized = false,
  className,
}: IOSActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={getActionClassName({ destructive, emphasized, className })}
    >
      {children}
    </button>
  );
}

export function IOSActionLink({
  href,
  children,
  onClick,
  emphasized = false,
  className,
}: IOSActionLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={getActionClassName({ emphasized, className })}
    >
      {children}
    </Link>
  );
}
