import { ContentBlock } from '@/lib/api'

interface ContentBlockRendererProps {
  block: ContentBlock
  fontSize?: number
  isPending?: boolean // True if translation is pending (from API or local request)
  showTranslatingLabel?: boolean // True only for the first pending block to show "Translating..." text
  coverUrl?: string | null // Book cover URL to use for images with relative paths
}

// Wrapper component for pending translation overlay
function PendingWrapper({ children, isPending, showLabel }: { children: React.ReactNode; isPending?: boolean; showLabel?: boolean }) {
  if (!isPending) return <>{children}</>;
  
  return (
    <div className="relative">
      <div className="blur-[3px] opacity-40">
        {children}
      </div>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium text-muted-foreground animate-pulse-text">
            Translating...
          </span>
        </div>
      )}
    </div>
  );
}

export default function ContentBlockRenderer({ block, fontSize, isPending, showTranslatingLabel, coverUrl }: ContentBlockRendererProps) {
  const style = fontSize ? { fontSize: `${fontSize}px` } : undefined

  if (block.type === 'hr') {
    return <hr className="my-6 border-border" />
  }

  if (block.type === 'image') {
    // Use coverUrl for relative image paths (EPUB internal paths like "images/xxx.jpg")
    let imageSrc = block.src
    if (imageSrc && !imageSrc.startsWith('http://') && !imageSrc.startsWith('https://') && !imageSrc.startsWith('data:')) {
      // Relative path - use book's coverUrl if available
      if (coverUrl) {
        imageSrc = coverUrl
      }
    }
    
    return (
      <figure className="my-5">
        <img src={imageSrc} alt={block.alt} className="w-full rounded-md" />
        {block.caption && (
          <figcaption className="text-sm text-muted-foreground text-center mt-2">
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (block.type === 'heading') {
    const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3'
    const baseClassName =
      block.level === 1
        ? 'text-xl font-bold mb-5 mt-8'
        : block.level === 2
          ? 'text-lg font-semibold mb-4 mt-6'
          : 'text-base font-semibold mb-3 mt-5'
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel}>
        <Tag className={baseClassName} style={style}>{block.text}</Tag>
      </PendingWrapper>
    )
  }

  if (block.type === 'paragraph') {
    const isFirst = block.isFirstPart ?? true;
    const isLast = block.isLastPart ?? true;
    const mbClass = isLast ? 'mb-5' : 'mb-0';
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel}>
        <p
          className={`${mbClass} leading-relaxed`}
          style={{ ...style, hyphens: 'auto', WebkitHyphens: 'auto' }}
        >
          {block.text}
        </p>
      </PendingWrapper>
    )
  }

  if (block.type === 'quote') {
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel}>
        <blockquote className="border-l-4 border-primary pl-4 my-5 italic text-muted-foreground" style={style}>
          {block.text}
        </blockquote>
      </PendingWrapper>
    )
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul'
    const listClass = block.ordered ? 'list-decimal' : 'list-disc'
    const isLast = block.isLastPart ?? true;
    const mbClass = isLast ? 'mb-5' : 'mb-0';
    const startProp = block.ordered && block.partIndex !== undefined ? block.partIndex + 1 : undefined;

    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel}>
        <Tag className={`${listClass} pl-6 ${mbClass} space-y-1`} style={style} start={startProp}>
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed" style={{ hyphens: 'auto', WebkitHyphens: 'auto' }}>{item}</li>
          ))}
        </Tag>
      </PendingWrapper>
    )
  }

  return null
}
