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

    // Recurse into children
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

  // Extract cover
  let cover: string | null = null;
  try {
    const coverUrl = await book.coverUrl();
    if (coverUrl) {
      const response = await fetch(coverUrl);
      const blob = await response.blob();
      cover = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn('Could not extract cover:', e);
  }

  const chapters: ParsedChapter[] = [];

  // Recursive TOC processing
  const processTocItem = async (tocItem: NavItem): Promise<void> => {
    const chapterTitle = tocItem.label?.trim() || 'Untitled';
    const href = tocItem.href;
    let content = '';
    let blocks: ParsedBlock[] = [];

    try {
      const hrefWithoutHash = href.split('#')[0];
      const section = spine.get(hrefWithoutHash);

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
      console.warn(`Could not extract content for chapter "${chapterTitle}":`, err);
    }

    chapters.push({ title: chapterTitle, href, content, blocks });

    // Process subitems recursively
    if (tocItem.subitems && tocItem.subitems.length > 0) {
      for (const subitem of tocItem.subitems) {
        await processTocItem(subitem);
      }
    }
  };

  for (const tocItem of navigation.toc) {
    await processTocItem(tocItem);
  }

  return {
    title: metadata.title || file.name.replace('.epub', ''),
    author: metadata.creator || 'Unknown',
    cover,
    language: metadata.language || null,
    chapters,
  };
}
