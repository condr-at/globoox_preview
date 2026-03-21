import Typograf from 'typograf';
import { ContentBlock } from '@/lib/api';

const typografByLocale = new Map<string, Typograf>();

function getLocale(lang?: string | null): string | null {
    if (!lang) return null;
    const normalized = lang.toLowerCase();
    if (normalized === 'en') return 'en-US';
    if (normalized === 'en-gb') return 'en-GB';
    if (normalized === 'en-us') return 'en-US';

    const short = normalized.split('-')[0];
    if (Typograf.hasLocale(normalized)) return normalized;
    if (short && Typograf.hasLocale(short)) return short;
    return null;
}

function getTypograf(locale: string): Typograf {
    const cached = typografByLocale.get(locale);
    if (cached) return cached;
    const tp = new Typograf({ locale: [locale] });
    typografByLocale.set(locale, tp);
    return tp;
}

function processText(tp: Typograf, value: string): string {
    return tp.execute(normalizeSoftWrapHyphens(value));
}

// EPUB/OCR sources sometimes store legacy line-wrap hyphenation as "fu- ture".
// Join only when hyphen is followed by whitespace and both sides look like word letters.
function normalizeSoftWrapHyphens(value: string): string {
    return value
        .replace(/([A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]{2,})-\s+([A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]{2,})/g, '$1$2')
        .replace(/\u00AD/g, '');
}

export function applyTypografToBlocks(blocks: ContentBlock[], lang?: string | null): ContentBlock[] {
    const locale = getLocale(lang);
    if (!locale || blocks.length === 0) return blocks;

    try {
        const tp = getTypograf(locale);

        return blocks.map((block) => {
            switch (block.type) {
                case 'paragraph':
                case 'quote': {
                    const text = processText(tp, block.text);
                    if (text === block.text) return block;
                    return { ...block, text };
                }
                case 'heading': {
                    const text = processText(tp, block.text);
                    if (text === block.text) return block;
                    return { ...block, text };
                }
                case 'list': {
                    if (!block.items?.length) return block;
                    const items = block.items.map((item) => processText(tp, item));
                    const changed = items.some((item, idx) => item !== block.items[idx]);
                    if (!changed) return block;
                    return { ...block, items };
                }
                default:
                    return block;
            }
        });
    } catch {
        return blocks;
    }
}
