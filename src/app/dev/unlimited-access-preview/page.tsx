'use client';

import { useState } from 'react';
import UnlimitedAccessModal from '@/components/UnlimitedAccessModal';
import { Button } from '@/components/ui/button';

export default function UnlimitedAccessPreviewPage() {
  const [open, setOpen] = useState(true);
  const [trigger, setTrigger] = useState<'translation_limit' | 'alpha_join'>('translation_limit');

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Unlimited Access Modal Preview</h1>
        <p className="text-sm text-muted-foreground">
          Isolated preview of the modal added for translation limit / alpha join flows.
        </p>
        <div className="flex gap-3">
          <Button type="button" onClick={() => setTrigger('translation_limit')}>
            Translation Limit
          </Button>
          <Button type="button" variant="outline" onClick={() => setTrigger('alpha_join')}>
            Alpha Join
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Reopen Modal
          </Button>
        </div>
      </div>

      <UnlimitedAccessModal
        open={open}
        onOpenChange={setOpen}
        userEmail="preview@globoox.co"
        trigger={trigger}
      />
    </main>
  );
}
