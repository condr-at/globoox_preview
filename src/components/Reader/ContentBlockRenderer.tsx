import { ContentBlock } from '@/lib/api'

interface ContentBlockRendererProps {
  block: ContentBlock
  fontSize?: number
}

export default function ContentBlockRenderer({ block, fontSize }: ContentBlockRendererProps) {
  const style = fontSize ? { fontSize: `${fontSize}px` } : undefined

  if (block.type === 'hr') {
    return <hr className="my-6 border-border" />
  }

  if (block.type === 'image') {
    return (
      <figure className="my-5">
        <img src={block.src} alt={block.alt} className="w-full rounded-md" />
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
    const className =
      block.level === 1
        ? 'text-xl font-bold mb-5 mt-8'
        : block.level === 2
        ? 'text-lg font-semibold mb-4 mt-6'
        : 'text-base font-semibold mb-3 mt-5'
    return <Tag className={className} style={style}>{block.text}</Tag>
  }

  if (block.type === 'paragraph') {
    return <p className="mb-5 leading-relaxed" style={style}>{block.text}</p>
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="border-l-4 border-primary pl-4 my-5 italic text-muted-foreground" style={style}>
        {block.text}
      </blockquote>
    )
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul'
    const listClass = block.ordered ? 'list-decimal' : 'list-disc'
    return (
      <Tag className={`${listClass} pl-6 mb-5 space-y-1`} style={style}>
        {block.items.map((item, i) => (
          <li key={i} className="leading-relaxed">{item}</li>
        ))}
      </Tag>
    )
  }

  return null
}
