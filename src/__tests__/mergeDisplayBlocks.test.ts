import { describe, expect, it } from 'vitest'
import type { ContentBlock } from '@/lib/api'
import { mergeDisplayBlocksPreservingTranslations } from '@/lib/reader/mergeDisplayBlocks'

describe('mergeDisplayBlocksPreservingTranslations', () => {
  it('preserves translated text when next block is not translated', () => {
    const prev: ContentBlock[] = [
      { id: 'p1', position: 1, type: 'paragraph', text: 'Bonjour', isTranslated: true, is_pending: false },
    ]
    const next: ContentBlock[] = [
      { id: 'p1', position: 1, type: 'paragraph', text: 'Hello', isTranslated: false, is_pending: true },
    ]
    expect(mergeDisplayBlocksPreservingTranslations(prev, next)).toEqual([
      { id: 'p1', position: 1, type: 'paragraph', text: 'Bonjour', isTranslated: true, is_pending: false },
    ])
  })

  it('does not overwrite a translated next block', () => {
    const prev: ContentBlock[] = [
      { id: 'p1', position: 1, type: 'paragraph', text: 'Bonjour', isTranslated: true, is_pending: false },
    ]
    const next: ContentBlock[] = [
      { id: 'p1', position: 1, type: 'paragraph', text: 'Salut', isTranslated: true, is_pending: false },
    ]
    expect(mergeDisplayBlocksPreservingTranslations(prev, next)).toEqual(next)
  })
})

