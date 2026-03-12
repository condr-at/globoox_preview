'use client';

import { useId, useState } from 'react';
import { Globe } from 'lucide-react';
import ReaderSettings from '@/components/Reader/ReaderSettings';
import TableOfContents from '@/components/Reader/TableOfContents';
import DeleteBookConfirmDialog from '@/components/Store/DeleteBookConfirmDialog';
import SignInToUploadModal from '@/components/SignInToUploadModal';
import UnlimitedAccessModal from '@/components/UnlimitedAccessModal';
import UploadBookModal from '@/components/UploadBookModal';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import {
  IOSAction,
  IOSActionDivider,
  IOSActionRow,
  IOSActionStack,
  IOSActionVerticalDivider,
} from '@/components/ui/ios-action-group';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import IOSFeaturePromptHeader from '@/components/ui/ios-feature-prompt-header';
import IOSFeaturePromptDialog from '@/components/ui/ios-feature-prompt-dialog';
import IOSFlowDialog from '@/components/ui/ios-flow-dialog';
import IOSFlowDialogHeader from '@/components/ui/ios-flow-dialog-header';
import IOSIconListItem from '@/components/ui/ios-icon-list-item';
import IOSReaderChromeHeader from '@/components/ui/ios-reader-chrome-header';
import IOSSheet from '@/components/ui/ios-sheet';
import IOSSheetHeader from '@/components/ui/ios-sheet-header';

type OverlayKey =
  | null
  | 'ios-alert'
  | 'ios-dialog'
  | 'ios-flow'
  | 'ios-sheet'
  | 'reader-sheet-pattern'
  | 'unlimited-limit'
  | 'unlimited-alpha'
  | 'upload-book'
  | 'sign-in-upload'
  | 'delete-book'
  | 'reader-settings'
  | 'table-of-contents';

type Layer = 'Primitive' | 'Pattern' | 'Example';

type CatalogItem = {
  title: string;
  layer: Layer;
  builtOn: string;
  useWhen: string;
  avoidWhen: string;
  inlinePreview?: React.ReactNode;
  openKey?: Exclude<OverlayKey, null>;
  secondaryOpenKey?: Exclude<OverlayKey, null>;
  secondaryLabel?: string;
  notes?: string;
};

function LayerBadge({ layer }: { layer: Layer }) {
  const palette =
    layer === 'Primitive'
      ? 'bg-[var(--fill-secondary)] text-[var(--label-secondary)]'
      : layer === 'Pattern'
        ? 'bg-[var(--system-blue)]/10 text-[var(--system-blue)]'
        : 'bg-[var(--fill-tertiary)] text-[var(--label-primary)]';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${palette}`}>
      {layer}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--separator)] bg-[var(--bg-grouped-secondary)] p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--label-primary)]">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--label-secondary)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CatalogCard({
  item,
  onOpen,
}: {
  item: CatalogItem;
  onOpen: (key: Exclude<OverlayKey, null>) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--separator)] bg-[var(--bg-grouped)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[17px] font-semibold text-[var(--label-primary)]">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--label-secondary)]">Built on: {item.builtOn}</p>
        </div>
        <div className="shrink-0">
          <LayerBadge layer={item.layer} />
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        <p className="text-[var(--label-primary)]">
          <span className="font-medium">Use when:</span> {item.useWhen}
        </p>
        <p className="text-[var(--label-secondary)]">
          <span className="font-medium text-[var(--label-primary)]">Avoid when:</span> {item.avoidWhen}
        </p>
        {item.inlinePreview ? item.inlinePreview : null}
        {item.notes ? (
          <p className="text-[var(--label-secondary)]">
            <span className="font-medium text-[var(--label-primary)]">Notes:</span> {item.notes}
          </p>
        ) : null}
      </div>

      {item.openKey ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onOpen(item.openKey!)}
            className="flex h-14 items-center justify-center rounded-2xl text-[17px] font-medium text-[var(--system-blue)] transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.06] px-4"
          >
            Open Preview
          </button>
          {item.secondaryOpenKey && item.secondaryLabel ? (
            <button
              type="button"
              onClick={() => onOpen(item.secondaryOpenKey!)}
              className="flex h-14 items-center justify-center rounded-2xl text-[17px] font-medium text-[var(--system-blue)] transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.06] px-4"
            >
              {item.secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SchematicPlaceholder({
  label,
  items,
  className = '',
}: {
  label: string;
  items: string[];
  className?: string;
}) {
  return (
    <div className={`border border-dashed border-pink-300 bg-pink-50 p-4 dark:border-pink-500/40 dark:bg-pink-500/10 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-700 dark:text-pink-300">
        {label}
      </p>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-pink-900 dark:text-pink-100">
        {items.join('\n')}
      </div>
    </div>
  );
}

export default function ComponentsPreviewPage() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayKey>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertDestructive, setAlertDestructive] = useState(false);
  const sheetTitleId = useId();
  const sheetDescriptionId = useId();

  const openOverlay = (key: Exclude<OverlayKey, null>) => setActiveOverlay(key);
  const closeOverlay = () => {
    setActiveOverlay(null);
    setAlertLoading(false);
  };

  const handleAlertConfirm = () => {
    if (alertLoading) return;
    setAlertLoading(true);
    window.setTimeout(() => {
      setAlertLoading(false);
      setActiveOverlay(null);
    }, 900);
  };

  const primitives: CatalogItem[] = [
    {
      title: 'IOSModalShell',
      layer: 'Primitive',
      builtOn: 'Portal + overlay + animation',
      useWhen: 'Building a new modal container inside the UI layer.',
      avoidWhen: 'Writing product-level dialogs or feature modals directly.',
      notes: 'Lowest level. Product code should not import this. No standalone preview.',
    },
    {
      title: 'IOSDialog',
      layer: 'Primitive',
      builtOn: 'IOSModalShell',
      useWhen: 'Building a higher-level centered or sheet-like dialog pattern in the UI layer.',
      avoidWhen: 'Implementing feature dialogs directly.',
      openKey: 'ios-dialog',
    },
    {
      title: 'IOSSheet',
      layer: 'Primitive',
      builtOn: 'IOSModalShell',
      useWhen: 'Building draggable bottom-sheet experiences, especially in reader surfaces.',
      avoidWhen: 'Short alerts or confirmations.',
      openKey: 'ios-sheet',
    },
    {
      title: 'IOSSheetHeader',
      layer: 'Primitive',
      builtOn: 'IOSSheet header layout',
      useWhen: 'Shared header for bottom sheets with title, subtitle, optional leading content, and close action.',
      avoidWhen: 'Flow dialog headers or reader top chrome.',
      inlinePreview: (
        <IOSSheetHeader
          title="Sheet Title"
          subtitle="Sheet subtitle"
          leading={(
            <div className="flex h-16 w-12 items-center justify-center border border-dashed border-pink-300 bg-pink-50 text-sm text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300">
              Cover
            </div>
          )}
          onClose={() => {}}
        />
      ),
    },
    {
      title: 'IOSFlowDialogHeader',
      layer: 'Primitive',
      builtOn: 'IOSDialog header layout',
      useWhen: 'Shared header for flow dialogs that need a centered title and optional description.',
      avoidWhen: 'Alert rows or reader-sheet headers.',
      inlinePreview: (
        <IOSFlowDialogHeader
          title="Flow Title"
          description="Flow description"
        />
      ),
    },
    {
      title: 'IOSFeaturePromptHeader',
      layer: 'Primitive',
      builtOn: 'Compact prompt header layout',
      useWhen: 'Compact feature prompts with centered title and supporting copy.',
      avoidWhen: 'Reader sheets, alerts, or drag-sheet headers.',
      inlinePreview: (
        <IOSFeaturePromptHeader
          title="Prompt Title"
          description="Prompt description"
        />
      ),
    },
    {
      title: 'IOSDialogFooter',
      layer: 'Primitive',
      builtOn: 'Shared action-row container',
      useWhen: 'Single or stacked action rows in flow dialogs.',
      avoidWhen: 'Embedding arbitrary body content or reader-sheet controls.',
      inlinePreview: (
        <IOSDialogFooter>
          <IOSActionStack>
            <IOSAction emphasized>Primary Action</IOSAction>
            <IOSActionDivider />
            <IOSAction>Secondary Action</IOSAction>
          </IOSActionStack>
        </IOSDialogFooter>
      ),
      notes: 'Action typography rule: regular by default. Use medium only for one primary action in light theme.',
    },
    {
      title: 'IOSDialogFooter (Horizontal)',
      layer: 'Primitive',
      builtOn: 'Shared action-row container',
      useWhen: 'Two side-by-side actions in a shared bottom action row.',
      avoidWhen: 'Vertical action stacks or body content.',
      inlinePreview: (
        <IOSDialogFooter>
          <IOSActionRow>
            <IOSAction>Cancel</IOSAction>
            <IOSActionVerticalDivider />
            <IOSAction emphasized>Confirm</IOSAction>
          </IOSActionRow>
        </IOSDialogFooter>
      ),
      notes: 'Horizontal pair follows the same rule: both actions stay regular unless there is exactly one primary action in light theme.',
    },
    {
      title: 'IOSReaderChromeHeader',
      layer: 'Primitive',
      builtOn: 'Reader top chrome layout',
      useWhen: 'Top header in ReaderView with back, title, language, and trailing actions.',
      avoidWhen: 'Modal headers or generic page headers.',
      inlinePreview: (
        <IOSReaderChromeHeader
          title="Book Title"
          subtitle="Author Name"
          trailingLeft={<span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[15px] font-medium">EN</span>}
          trailingRight={<span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px]">…</span>}
        />
      ),
    },
    {
      title: 'IOSIconListItem',
      layer: 'Primitive',
      builtOn: 'Small icon + label row',
      useWhen: 'Short benefit or feature lists inside dialogs and sheets.',
      avoidWhen: 'Dense settings rows or action rows.',
      inlinePreview: (
        <ul>
          <IOSIconListItem icon={Globe}>
            Benefit copy goes here
          </IOSIconListItem>
        </ul>
      ),
    },
  ];

  const patterns: CatalogItem[] = [
    {
      title: 'IOSAlertDialog',
      layer: 'Pattern',
      builtOn: 'IOSDialog',
      useWhen: 'Alerts, confirmations, warnings, and any short blocking decision.',
      avoidWhen: 'Long flows, forms, or rich content.',
      openKey: 'ios-alert',
      notes: 'This is the only alert/confirm pattern.',
    },
    {
      title: 'IOSFlowDialog',
      layer: 'Pattern',
      builtOn: 'IOSDialog',
      useWhen: 'Sign in gates, upload flows, and richer modal content with custom body layout.',
      avoidWhen: 'Anything that should look like an alert row stack.',
      openKey: 'ios-flow',
      notes: 'Feature modals should use this instead of importing IOSDialog directly.',
    },
    {
      title: 'IOSFeaturePromptDialog',
      layer: 'Pattern',
      builtOn: 'IOSDialog + IOSFeaturePromptHeader + IOSDialogFooter',
      useWhen: 'Compact prompts with richer explanatory content, like benefits lists or feature pitches.',
      avoidWhen: 'Short alerts or full sheet flows.',
      notes: 'Use this when content is richer than an alert but still fits a compact dialog.',
    },
    {
      title: 'Reader Sheet Pattern',
      layer: 'Pattern',
      builtOn: 'IOSSheet + IOSSheetHeader',
      useWhen: 'Reader-specific bottom drawers like Appearance and Chapters.',
      avoidWhen: 'General app modals outside the reader experience.',
      openKey: 'reader-sheet-pattern',
      notes: 'Appearance and Chapters are the current reference implementations.',
    },
  ];

  const examples: CatalogItem[] = [
    {
      title: 'DeleteBookConfirmDialog',
      layer: 'Example',
      builtOn: 'IOSAlertDialog',
      useWhen: 'Destructive confirmation example.',
      avoidWhen: 'Any flow with richer content or follow-up state.',
      openKey: 'delete-book',
    },
    {
      title: 'UnlimitedAccessModal',
      layer: 'Example',
      builtOn: 'IOSAlertDialog + IOSFlowDialog',
      useWhen: 'Translation limit alert and alpha-access flow.',
      avoidWhen: 'Creating new modal types without mapping to an existing pattern.',
      openKey: 'unlimited-alpha',
    },
    {
      title: 'UploadBookModal',
      layer: 'Example',
      builtOn: 'IOSFlowDialog',
      useWhen: 'File upload flow inside a modal.',
      avoidWhen: 'Simple one-step alerts.',
      openKey: 'upload-book',
    },
    {
      title: 'SignInToUploadModal',
      layer: 'Example',
      builtOn: 'IOSFeaturePromptDialog',
      useWhen: 'Account gate that redirects to the canonical auth page.',
      avoidWhen: 'Provider-specific auth shortcuts inside a modal.',
      openKey: 'sign-in-upload',
    },
    {
      title: 'ReaderSettings (Appearance)',
      layer: 'Example',
      builtOn: 'IOSSheet + IOSSheetHeader',
      useWhen: 'Reader-specific settings bottom sheet.',
      avoidWhen: 'General app settings or non-reader flows.',
      openKey: 'reader-settings',
      notes: 'Reference implementation. Lives in [ReaderSettings.tsx] and is intentionally unchanged.',
    },
    {
      title: 'TableOfContents (Chapters)',
      layer: 'Example',
      builtOn: 'IOSSheet + IOSSheetHeader',
      useWhen: 'Reader chapter navigation sheet.',
      avoidWhen: 'Generic list modals elsewhere in the app.',
      openKey: 'table-of-contents',
      notes: 'Reference implementation. Lives in [TableOfContents.tsx] and is intentionally unchanged.',
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-grouped)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="max-w-4xl">
          <p className="text-sm font-medium text-[var(--system-blue)]">Design Catalog</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.03em] text-[var(--label-primary)]">
            Components Preview
          </h1>
          <p className="mt-3 text-[17px] leading-[24px] text-[var(--label-secondary)]">
            This page documents the modal stack by layer so it is obvious what can be inserted where.
          </p>
        </header>

        <Section
          title="Rules"
          description="These are the constraints for how modal code should be composed in product code."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-grouped)] p-4 text-sm text-[var(--label-primary)]">
              <p className="font-medium">Allowed in feature code</p>
              <p className="mt-2 text-[var(--label-secondary)]">
                `IOSAlertDialog`, `IOSFlowDialog`, and reader-specific sheet components built on `IOSSheet`.
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-grouped)] p-4 text-sm text-[var(--label-primary)]">
              <p className="font-medium">Do not use directly</p>
              <p className="mt-2 text-[var(--label-secondary)]">
                `IOSModalShell` and `IOSDialog` should stay in the UI layer unless you are defining a new canonical pattern.
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-grouped)] p-4 text-sm text-[var(--label-primary)]">
              <p className="font-medium">Action weight</p>
              <p className="mt-2 text-[var(--label-secondary)]">
                Use regular by default. `font-medium` is allowed only for a single primary action in light theme.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Primitives"
          description="Low-level building blocks. These define behavior and container geometry, not product semantics."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {primitives.map((item) => (
              <CatalogCard key={item.title} item={item} onOpen={openOverlay} />
            ))}
          </div>
        </Section>

        <Section
          title="Patterns"
          description="Canonical modal patterns. Product code should choose one of these instead of inventing new layouts."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {patterns.map((item) => (
              <CatalogCard key={item.title} item={item} onOpen={openOverlay} />
            ))}
          </div>
        </Section>

        <Section
          title="Examples"
          description="Real project components grouped under the pattern they belong to."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {examples.map((item) => (
              <CatalogCard key={item.title} item={item} onOpen={openOverlay} />
            ))}
          </div>
        </Section>
      </div>

      <IOSAlertDialog
        open={activeOverlay === 'ios-alert'}
        onOpenChange={(open) => !open && closeOverlay()}
        title="Alert Title"
        description={(
          <SchematicPlaceholder
            label="Alert content"
            items={['Short description', 'Optional short supporting text']}
            className="mt-1"
          />
        )}
        confirmLabel={alertLoading ? 'Loading...' : alertDestructive ? 'Delete' : 'OK'}
        cancelLabel="Cancel"
        onConfirm={handleAlertConfirm}
        destructive={alertDestructive}
        loading={alertLoading}
        showCancel
      />

      <IOSDialog
        open={activeOverlay === 'ios-dialog'}
        onOpenChange={(open) => !open && closeOverlay()}
        className="sm:max-w-sm"
      >
        <div className="px-6 py-6">
          <SchematicPlaceholder
            label="Dialog body"
            items={['Header', 'Body content', 'Optional footer row']}
          />
        </div>
      </IOSDialog>

      <IOSFlowDialog
        open={activeOverlay === 'ios-flow'}
        onOpenChange={(open) => !open && closeOverlay()}
        title="Flow Title"
        description="Flow description"
      >
        <div className="mt-5">
          <SchematicPlaceholder
            label="Flow content"
            items={['Form fields', 'Task-specific content', 'Primary flow action']}
          />
        </div>
      </IOSFlowDialog>

      <IOSSheet
        open={activeOverlay === 'ios-sheet'}
        onOpenChange={(open) => !open && closeOverlay()}
        dragHandle={<div className="h-1 w-10 rounded-full bg-[var(--label-tertiary)]/40" />}
        enableDragDismiss
      >
        <div className="px-5 pb-5">
          <SchematicPlaceholder
            label="Sheet container"
            items={['Optional header', 'Scrollable body', 'Optional bottom spacing']}
          />
        </div>
      </IOSSheet>

      <IOSSheet
        open={activeOverlay === 'reader-sheet-pattern'}
        onOpenChange={(open) => !open && closeOverlay()}
        labelledBy={sheetTitleId}
        describedBy={sheetDescriptionId}
        dragHandle={<div className="h-1 w-10 rounded-full bg-[var(--label-tertiary)]/40" />}
        enableDragDismiss
      >
        <IOSSheetHeader
          title={<span id={sheetTitleId}>Appearance</span>}
          subtitle={<span id={sheetDescriptionId}>Reader controls and grouped content.</span>}
          onClose={closeOverlay}
        />
        <div className="px-5 pb-6">
          <SchematicPlaceholder
            label="Reader sheet content"
            items={['Grouped setting rows', 'Reader-specific controls', 'Chapter list or appearance controls']}
          />
        </div>
      </IOSSheet>

      <UnlimitedAccessModal
        open={activeOverlay === 'unlimited-limit'}
        onOpenChange={(open) => !open && closeOverlay()}
        userEmail="preview@globoox.co"
        trigger="translation_limit"
      />

      <UnlimitedAccessModal
        open={activeOverlay === 'unlimited-alpha'}
        onOpenChange={(open) => !open && closeOverlay()}
        userEmail="preview@globoox.co"
        trigger="alpha_join"
      />

      <UploadBookModal
        isOpen={activeOverlay === 'upload-book'}
        onClose={closeOverlay}
      />

      <SignInToUploadModal
        isOpen={activeOverlay === 'sign-in-upload'}
        onClose={closeOverlay}
      />

      <DeleteBookConfirmDialog
        open={activeOverlay === 'delete-book'}
        title="The Left Hand of Darkness"
        onConfirm={closeOverlay}
        onCancel={closeOverlay}
      />

      <ReaderSettings
        open={activeOverlay === 'reader-settings'}
        onOpenChange={(open) => !open && closeOverlay()}
      />

      <TableOfContents
        bookTitle="The Left Hand of Darkness"
        bookAuthor="Ursula K. Le Guin"
        coverUrl={null}
        isContentPending={false}
        chapters={[
          { number: 1, title: 'A Parade in Erhenrang' },
          { number: 2, title: 'The Place Inside the Blizzard' },
          { number: 3, title: 'The Mad King', depth: 2 },
          { number: 4, title: 'The Nineteenth Day', depth: 2 },
          { number: 5, title: 'On the Ice' },
        ]}
        currentChapter={2}
        onSelectChapter={closeOverlay}
        open={activeOverlay === 'table-of-contents'}
        onOpenChange={(open) => !open && closeOverlay()}
      />
    </main>
  );
}
