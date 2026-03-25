import { ContentBlock } from '@/lib/api'
import { getLineHeightStyle } from '@/lib/readerTypography'

interface ContentBlockRendererProps {
  block: ContentBlock
  fontSize?: number
  isPending?: boolean // True if translation is pending (from API or local request)
  showTranslatingLabel?: boolean // True only for the first pending block to show "Translating..." text
  pendingLabel?: string
  coverUrl?: string | null // Book cover URL to use for images with relative paths
  isCoverImage?: boolean // True only for the first image block (the actual book cover)
  imageMaxHeight?: number
  lineHeightScale?: number
}

function getHeadingTypography(level: number): {
  className: string
  sizeScale: number
  italic: boolean
} {
  if (level === 1) {
    return { className: 'font-medium mb-3 mt-6', sizeScale: 1.6, italic: false }
  }
  if (level === 2) {
    return { className: 'font-medium mb-2 mt-5', sizeScale: 1.35, italic: false }
  }
  if (level === 3) {
    return { className: 'font-medium mb-2 mt-4', sizeScale: 1.18, italic: false }
  }
  if (level === 4 || level === 5) {
    return { className: 'font-normal mb-2 mt-4', sizeScale: 1.06, italic: true }
  }
  return { className: 'font-normal mb-2 mt-4', sizeScale: 1.06, italic: false }
}

// Wrapper component for pending translation overlay
function PendingWrapper({
  children,
  isPending,
  showLabel,
  pendingLabel = 'Translating...',
}: {
  children: React.ReactNode;
  isPending?: boolean;
  showLabel?: boolean;
  pendingLabel?: string;
}) {
  if (!isPending) return <>{children}</>;
  
  return (
    <div className="relative">
      <div className="blur-[3px] opacity-40">
        {children}
      </div>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium text-muted-foreground animate-pulse-text">
            {pendingLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ContentBlockRenderer({
  block,
  fontSize,
  isPending,
  showTranslatingLabel,
  pendingLabel,
  coverUrl,
  isCoverImage,
  imageMaxHeight,
  lineHeightScale = 1,
}: ContentBlockRendererProps) {
  const style = fontSize ? { fontSize: `${fontSize}px` } : undefined
  const textStyle = fontSize
    ? { ...style, lineHeight: getLineHeightStyle(fontSize, lineHeightScale) }
    : style
  const resolvedImageMaxHeight = imageMaxHeight ? Math.max(160, imageMaxHeight - 24) : undefined

  if (block.type === 'hr') {
    return <hr className="my-5 border-border" />
  }

  if (block.type === 'image') {
    // For relative EPUB paths, only substitute coverUrl for the first image (the actual cover).
    // Other in-chapter images with relative paths cannot be resolved and are skipped.
    let imageSrc = block.src
    if (imageSrc && !imageSrc.startsWith('http://') && !imageSrc.startsWith('https://') && !imageSrc.startsWith('data:') && !imageSrc.startsWith('/')) {
      if (isCoverImage && coverUrl) {
        imageSrc = coverUrl
      } else {
        return null
      }
    }
    
    return (
      <figure className="my-4 select-none">
        <img
          src={imageSrc}
          alt={block.alt}
          draggable={false}
          className="mx-auto block h-auto max-w-full rounded-md object-contain"
          style={resolvedImageMaxHeight ? { maxHeight: `${resolvedImageMaxHeight}px` } : undefined}
        />
        {block.caption && (
          <figcaption className="text-xs text-muted-foreground text-center mt-1">
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (block.type === 'heading') {
    const normalizedLevel = Math.max(1, Math.min(6, Number(block.level) || 1))
    const Tag = `h${normalizedLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    const headingTypography = getHeadingTypography(normalizedLevel)
    const headingStyle = fontSize
      ? { fontSize: `${fontSize * headingTypography.sizeScale}px`, fontStyle: headingTypography.italic ? 'italic' : 'normal' as const }
      : { fontStyle: headingTypography.italic ? 'italic' : 'normal' as const }
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel}>
        <Tag className={headingTypography.className} style={headingStyle}>{block.text}</Tag>
      </PendingWrapper>
    )
  }

  if (block.type === 'paragraph') {
    const isLast = block.isLastPart ?? true;
    const mbClass = isLast ? 'mb-2' : 'mb-0';
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel}>
        <p
          className={mbClass}
          style={{ ...textStyle, hyphens: 'auto', WebkitHyphens: 'auto' }}
        >
          {block.text}
        </p>
      </PendingWrapper>
    )
  }

  if (block.type === 'quote') {
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel}>
        <blockquote className="border-l-1 border-primary pl-3 my-4 italic text-foreground/80" style={style}>
          {block.text}
        </blockquote>
      </PendingWrapper>
    )
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul'
    const listClass = block.ordered ? 'list-decimal' : 'list-disc'
    const isLast = block.isLastPart ?? true;
    const mbClass = isLast ? 'mb-3' : 'mb-1';
    const startProp = block.ordered && block.partIndex !== undefined ? block.partIndex + 1 : undefined;

    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel}>
        <Tag className={`${listClass} pl-6 ${mbClass} space-y-1`} style={style} start={startProp}>
          {block.items.map((item, i) => (
            <li key={i} style={{ ...textStyle, hyphens: 'auto', WebkitHyphens: 'auto' }}>{item}</li>
          ))}
        </Tag>
      </PendingWrapper>
    )
  }

  return null
}
