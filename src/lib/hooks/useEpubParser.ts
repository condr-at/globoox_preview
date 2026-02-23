'use client';

import ePub, { Book, NavItem } from 'epubjs';

export interface ParsedBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'image' | 'hr';
  text?: string;
  level?: number;
  items?: string[];
  src?: string;
  alt?: string;
}

export interface ParsedChapter {
  title: string;
  href: string;
  content: string;
  blocks: ParsedBlock[];
  depth: number;
  parentIndex: number | null;
}

export interface ParsedEpub {
  title: string;
  author: string;
  cover: string | null;
  language: string | null;
  chapters: ParsedChapter[];
}

function extractBlocks(element: Element): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  const walk = (node: Element) => {
    const tag = node.tagName?.toLowerCase();

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({
          type: 'heading',
          level: parseInt(tag[1]),
          text,
        });
      }
      return;
    }

    if (tag === 'p') {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({ type: 'paragraph', text });
      }
      return;
    }

    if (tag === 'blockquote') {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({ type: 'quote', text });
      }
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li'))
        .map((li) => li.textContent?.trim() || '')
        .filter(Boolean);
      if (items.length) {
        blocks.push({ type: 'list', items });
      }
      return;
    }

    if (tag === 'img') {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      if (src) {
        blocks.push({ type: 'image', src, alt });
      }
      return;
    }

    if (tag === 'hr') {
      blocks.push({ type: 'hr' });
      return;
    }

    // Handle div/section/article/span — containers that might hold text or block children
    if (['div', 'section', 'article', 'span'].includes(tag)) {
      const blockTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'div', 'section', 'article', 'figure', 'hr', 'img']);
      const hasBlockChildren = Array.from(node.children).some((child) =>
        blockTags.has(child.tagName?.toLowerCase())
      );

      if (hasBlockChildren) {
        // Recurse into block-level children
        Array.from(node.children).forEach(walk);
        return;
      }

      // No block children — treat the entire element's text as a paragraph
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({ type: 'paragraph', text });
      }
      return;
    }

    // Recurse into unknown elements' children
    Array.from(node.children).forEach(walk);
  };

  walk(element);
  return blocks;
}

export async function parseEpub(file: File): Promise<ParsedEpub> {
  const arrayBuffer = await file.arrayBuffer();
  const book: Book = ePub(arrayBuffer);

  await book.ready;

  const metadata = await book.loaded.metadata;
  const navigation = await book.loaded.navigation;
  const spine = book.spine;

  // Extract and compress cover (max 800px, JPEG quality 0.7)
  let cover: string | null = null;
  try {
    const coverUrl = await book.coverUrl();
    if (coverUrl) {
      const response = await fetch(coverUrl);
      const blob = await response.blob();
      
      // Compress cover using canvas
      const img = new Image();
      const imgLoaded = new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });
      img.src = URL.createObjectURL(blob);
      await imgLoaded;
      
      const maxSize = 800;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      cover = canvas.toDataURL('image/jpeg', 0.7);
      
      URL.revokeObjectURL(img.src);
    }
  } catch (e) {
    console.warn('Could not extract cover:', e);
  }

  // Step 1: Flatten TOC into array with hierarchy info (fast, no I/O)
  interface TocEntry {
    title: string;
    href: string;
    depth: number;
    parentIndex: number | null;
  }
  const tocEntries: TocEntry[] = [];
  
  const flattenToc = (items: NavItem[], depth: number, parentIndex: number | null) => {
    for (const item of items) {
      const currentIndex = tocEntries.length;
      tocEntries.push({
        title: item.label?.trim() || 'Untitled',
        href: item.href,
        depth,
        parentIndex,
      });
      if (item.subitems?.length) {
        flattenToc(item.subitems, depth + 1, currentIndex);
      }
    }
  };
  flattenToc(navigation.toc, 1, null);

  // Step 2: Build href->section lookup once (fast)
  const sectionMap = new Map<string, any>();
  spine.each((item: any) => {
    if (item.href) {
      sectionMap.set(item.href, item);
      // Also map by filename only
      const filename = item.href.split('/').pop();
      if (filename && !sectionMap.has(filename)) {
        sectionMap.set(filename, item);
      }
    }
  });

  // Step 3: Process chapters in parallel batches
  const BATCH_SIZE = 5;
  const chapters: ParsedChapter[] = new Array(tocEntries.length);
  
  for (let i = 0; i < tocEntries.length; i += BATCH_SIZE) {
    const batch = tocEntries.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (entry, batchIdx) => {
        const idx = i + batchIdx;
        let content = '';
        let blocks: ParsedBlock[] = [];

        try {
          const hrefWithoutHash = entry.href.split('#')[0];
          const filename = hrefWithoutHash.split('/').pop() || hrefWithoutHash;
          
          // Fast lookup
          let section = sectionMap.get(hrefWithoutHash) || sectionMap.get(filename);
          
          if (section) {
            await section.load(book.load.bind(book));
            const doc = section.document;
            if (doc) {
              const body = doc.body || doc.documentElement;
              if (body) {
                blocks = extractBlocks(body);
                content = blocks
                  .filter((b) => b.type !== 'image' && b.type !== 'hr')
                  .map((b) => {
                    if (b.type === 'list') return b.items?.join('\n');
                    if ('text' in b) return b.text;
                    return '';
                  })
                  .filter(Boolean)
                  .join('\n\n');
              }
            }
            section.unload();
          }
        } catch (err) {
          // Skip failed chapters silently
        }

        chapters[idx] = {
          title: entry.title,
          href: entry.href,
          content,
          blocks,
          depth: entry.depth,
          parentIndex: entry.parentIndex,
        };
      })
    );
  }

  return {
    title: metadata.title || file.name.replace('.epub', ''),
    author: metadata.creator || 'Unknown',
    cover,
    language: metadata.language || null,
    chapters,
  };
}
