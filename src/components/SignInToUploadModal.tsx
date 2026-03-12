'use client';

import { BookMarked, Smartphone, Globe } from 'lucide-react';
import { IOSAction, IOSActionDivider, IOSActionLink, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSFeaturePromptDialog from '@/components/ui/ios-feature-prompt-dialog';
import IOSIconListItem from '@/components/ui/ios-icon-list-item';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  { icon: BookMarked, text: 'Your books saved and accessible anywhere' },
  { icon: Smartphone, text: 'Progress synced across all your devices' },
  { icon: Globe, text: 'AI translation to EN · FR · ES · RU' },
];

export default function SignInToUploadModal({ isOpen, onClose }: Props) {
  return (
    <IOSFeaturePromptDialog
      open={isOpen}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Upload your first book"
      description="A free account keeps your library safe and lets you read any EPUB in four languages."
      footer={(
        <IOSActionStack>
          <IOSActionLink
            href="/auth"
            onClick={onClose}
            emphasized
          >
            Sign In or Create Account
          </IOSActionLink>
          <IOSActionDivider />
          <IOSAction onClick={onClose}>Maybe later</IOSAction>
        </IOSActionStack>
      )}
    >
      <ul className="space-y-3 text-left">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <IOSIconListItem key={text} icon={Icon}>
            {text}
          </IOSIconListItem>
        ))}
      </ul>
    </IOSFeaturePromptDialog>
  );
}
