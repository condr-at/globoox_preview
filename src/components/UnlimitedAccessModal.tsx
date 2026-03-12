'use client';

import { useEffect, useState } from 'react';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import { joinWaitlist } from '@/lib/api';

interface UnlimitedAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  /** Context for the title/description copy */
  trigger?: 'translation_limit' | 'alpha_join';
}

export default function UnlimitedAccessModal({
  open,
  onOpenChange,
  userEmail,
  trigger = 'translation_limit',
}: UnlimitedAccessModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Reset state when modal opens
  useEffect(() => {
    if (open) setStatus('idle');
  }, [open]);

  const handleSendRequest = async () => {
    setStatus('loading');
    try {
      await joinWaitlist(userEmail);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (trigger === 'translation_limit') {
    const alertDescription = status === 'success'
      ? (
          <span>
            Your request has been sent. We&apos;ll reach out to{' '}
            <span className="font-medium">{userEmail}</span> soon.
          </span>
        )
      : (
          <span>
            The free plan allows translating one book. We&apos;ll contact you at{' '}
            <span className="font-medium">{userEmail}</span>.
          </span>
        );

    return (
      <IOSAlertDialog
        open={open}
        onOpenChange={onOpenChange}
        title={status === 'success' ? 'Request Sent' : 'Translation Limit Reached'}
        description={alertDescription}
        confirmLabel={status === 'success' ? 'Done' : status === 'loading' ? 'Sending...' : 'Send Access Request'}
        cancelLabel="Not Now"
        onConfirm={status === 'success' ? () => onOpenChange(false) : handleSendRequest}
        showCancel={status !== 'success'}
        loading={status === 'loading'}
      />
    );
  }

  const alphaDescription = status === 'success'
    ? (
        <span>
          Your request has been sent. We&apos;ll reach out to{' '}
          <span className="font-medium">{userEmail}</span> soon.
        </span>
      )
    : (
        <span>
          Want early access to all features? We&apos;ll contact you at{' '}
          <span className="font-medium">{userEmail}</span>.
          {status === 'error' ? (
            <span className="block mt-3 text-[var(--system-red)]">
              Something went wrong. Please try again.
            </span>
          ) : null}
        </span>
      );

  return (
    <IOSAlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title={status === 'success' ? 'Request Sent' : 'Get Unlimited Access'}
      description={alphaDescription}
      confirmLabel={status === 'success' ? 'Done' : status === 'loading' ? 'Sending...' : 'Send Access Request'}
      cancelLabel="Not Now"
      onConfirm={status === 'success' ? () => onOpenChange(false) : handleSendRequest}
      showCancel={status !== 'success'}
      actionsLayout="vertical"
      loading={status === 'loading'}
    />
  );
}
