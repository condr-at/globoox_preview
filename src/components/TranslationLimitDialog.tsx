'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Languages, Sparkles } from 'lucide-react';
import IOSFeatureDialog from '@/components/ui/ios-feature-dialog';
import { IOSAction, IOSActionDivider, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSIconFeatureListItem from '@/components/ui/ios-icon-feature-list-item';
import { joinWaitlist } from '@/lib/api';

interface TranslationLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

const EXPANDED_ACCESS_BENEFITS = [
  { icon: BookOpen, text: 'Translate more than one book' },
  { icon: Languages, text: 'Keep reading across all supported languages' },
  { icon: Sparkles, text: 'Get early access to upcoming translation improvements' },
];

export default function TranslationLimitDialog({
  open,
  onOpenChange,
  userEmail,
}: TranslationLimitDialogProps) {
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
          The free plan allows translating one book. Request expanded access and we&apos;ll contact you at{' '}
          <span className="font-medium">{userEmail}</span>.
          {status === 'error' ? (
            <span className="mt-2 block text-[var(--system-red)]">
              Something went wrong. Please try again.
            </span>
          ) : null}
        </span>
      );

  return (
    <IOSFeatureDialog
      open={open}
      onOpenChange={onOpenChange}
      title={status === 'success' ? 'Request Sent' : 'Translation Limit Reached'}
      description={description}
      footer={(
        <IOSActionStack>
          {status === 'success' ? (
            <IOSAction emphasized onClick={() => onOpenChange(false)}>
              Done
            </IOSAction>
          ) : (
            <>
              <IOSAction emphasized onClick={handleSendRequest} disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending...' : 'Send Access Request'}
              </IOSAction>
              <IOSActionDivider />
              <IOSAction onClick={() => onOpenChange(false)} disabled={status === 'loading'}>
                Not Now
              </IOSAction>
            </>
          )}
        </IOSActionStack>
      )}
    >
      {status !== 'success' ? (
        <ul className="space-y-3 text-left">
          {EXPANDED_ACCESS_BENEFITS.map(({ icon: Icon, text }) => (
            <IOSIconFeatureListItem key={text} icon={Icon}>
              {text}
            </IOSIconFeatureListItem>
          ))}
        </ul>
      ) : null}
    </IOSFeatureDialog>
  );
}
