'use client';

import { useEffect, useState } from 'react';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import { joinWaitlist } from '@/lib/api';

interface JoinAlphaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export default function JoinAlphaDialog({
  open,
  onOpenChange,
  userEmail,
}: JoinAlphaDialogProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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

  const description = status === 'success'
    ? (
        <span>
          Your request has been sent. We&apos;ll reach out to{' '}
          <span className="font-medium">{userEmail}</span> soon.
        </span>
      )
    : (
        <span>
          Join the alpha program and get early access to new features. We&apos;ll contact you at{' '}
          <span className="font-medium">{userEmail}</span>.
          {status === 'error' ? (
            <span className="mt-2 block text-destructive">
              Something went wrong. Please try again.
            </span>
          ) : null}
        </span>
      );

  return (
    <IOSAlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title={status === 'success' ? 'Request Sent' : 'Join Alpha Program'}
      description={description}
      confirmLabel={status === 'success' ? 'Done' : status === 'loading' ? 'Sending...' : 'Send Request'}
      cancelLabel="Not Now"
      onConfirm={status === 'success' ? () => onOpenChange(false) : handleSendRequest}
      showCancel={status !== 'success'}
      loading={status === 'loading'}
    />
  );
}
