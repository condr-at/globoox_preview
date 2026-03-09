'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import IOSDialog from '@/components/ui/ios-dialog';
import { Button } from '@/components/ui/button';
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

  const title =
    trigger === 'alpha_join' ? 'Get Unlimited Access' : 'Translation Limit Reached';

  const description =
    trigger === 'alpha_join'
      ? 'Want early access to all features? Send us a request and we\'ll get back to you.'
      : 'The free plan allows translating one book. Send us a request to unlock unlimited translations.';

  return (
    <IOSDialog open={open} onOpenChange={onOpenChange} mobileLayout="sheet">
      <div className="px-6 pt-6 pb-2 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {status !== 'success' && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {status === 'success' ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Your request has been sent! We&apos;ll reach out to{' '}
              <span className="font-medium text-foreground">{userEmail}</span> soon.
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              We&apos;ll contact you at{' '}
              <span className="font-medium text-foreground">{userEmail}</span>
            </p>
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleSendRequest}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {status === 'loading' ? 'Sending…' : 'Send Access Request'}
            </Button>
            {status === 'error' && (
              <p className="text-xs text-destructive text-center">
                Something went wrong. Please try again.
              </p>
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={status === 'loading'}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </IOSDialog>
  );
}
