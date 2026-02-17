import { describe, it, expect } from 'vitest'
import { computePages, findPageForBlock, findPageByBlockPosition } from '@/lib/paginatorUtils'
import { ContentBlock } from '@/lib/api'

// Helpers ────────────────────────────────────────────────────────────────────

function makeBlock(id: string, position: number): ContentBlock {
  return { id, position, type: 'paragraph', text: `Block ${id}` }
}

function makeHeights(blocks: ContentBlock[], height: number): Map<string, number> {
  return new Map(blocks.map((b) => [b.id, height]))
}

// computePages ───────────────────────────────────────────────────────────────

describe('computePages', () => {
  it('returns empty array for empty blocks', () => {
    expect(computePages([], new Map(), 800)).toEqual([])
  })

  it('returns empty array when pageHeight is zero', () => {
    const blocks = [makeBlock('a', 0)]
    expect(computePages(blocks, makeHeights(blocks, 100), 0)).toEqual([])
  })

  it('fits multiple blocks onto one page', () => {
    const blocks = [makeBlock('a', 0), makeBlock('b', 1), makeBlock('c', 2)]
    // each block = 100px, page = 500px → all fit on one page
    const pages = computePages(blocks, makeHeights(blocks, 100), 500)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toEqual(['a', 'b', 'c'])
  })

  it('splits blocks across pages correctly', () => {
    const blocks = [makeBlock('a', 0), makeBlock('b', 1), makeBlock('c', 2), makeBlock('d', 3)]
    // each block = 300px, page = 500px → at most 1 per page after first
    // a (300) + b (300) = 600 > 500 → page break before b
    const pages = computePages(blocks, makeHeights(blocks, 300), 500)
    expect(pages).toHaveLength(4)
    expect(pages[0]).toEqual(['a'])
    expect(pages[1]).toEqual(['b'])
  })

  it('keeps at least one block per page even if it overflows', () => {
    const blocks = [makeBlock('big', 0)]
    // block is taller than page — must still create one page
    const pages = computePages(blocks, makeHeights(blocks, 2000), 800)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toEqual(['big'])
  })

  it('uses fallback height (80) for blocks missing from height map', () => {
    const blocks = [makeBlock('a', 0), makeBlock('b', 1)]
    // no heights in map — fallback 80 each, page = 200 → both fit
    const pages = computePages(blocks, new Map(), 200)
    expect(pages).toHaveLength(1)
  })

  it('packs blocks that exactly fill the page without overflow', () => {
    const blocks = [makeBlock('a', 0), makeBlock('b', 1)]
    // each 200px, page = 400px → both fit exactly
    const pages = computePages(blocks, makeHeights(blocks, 200), 400)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toEqual(['a', 'b'])
  })
})

// findPageForBlock ────────────────────────────────────────────────────────────

describe('findPageForBlock', () => {
  const pages = [['a', 'b'], ['c', 'd'], ['e']]

  it('finds block on the first page', () => {
    expect(findPageForBlock(pages, 'a')).toBe(0)
    expect(findPageForBlock(pages, 'b')).toBe(0)
  })

  it('finds block on a middle page', () => {
    expect(findPageForBlock(pages, 'c')).toBe(1)
  })

  it('finds block on the last page', () => {
    expect(findPageForBlock(pages, 'e')).toBe(2)
  })

  it('returns -1 for a block not in any page', () => {
    expect(findPageForBlock(pages, 'z')).toBe(-1)
  })

  it('returns -1 for empty pages array', () => {
    expect(findPageForBlock([], 'a')).toBe(-1)
  })
})

// findPageByBlockPosition ────────────────────────────────────────────────────

describe('findPageByBlockPosition', () => {
  // blocks at positions 0, 10, 20, 30, 40
  const blocks: ContentBlock[] = [
    makeBlock('p0', 0),
    makeBlock('p10', 10),
    makeBlock('p20', 20),
    makeBlock('p30', 30),
    makeBlock('p40', 40),
  ]
  // pages: [p0, p10] | [p20, p30] | [p40]
  const pages = [['p0', 'p10'], ['p20', 'p30'], ['p40']]

  it('returns page 0 when target position is before or at first block', () => {
    expect(findPageByBlockPosition(pages, blocks, 0)).toBe(0)
  })

  it('returns the correct page for a mid-range position', () => {
    expect(findPageByBlockPosition(pages, blocks, 20)).toBe(1)
  })

  it('returns the last page when target position exceeds all blocks', () => {
    expect(findPageByBlockPosition(pages, blocks, 999)).toBe(2)
  })

  it('returns the last page for empty pages array', () => {
    expect(findPageByBlockPosition([], blocks, 0)).toBe(0)
  })
})

// Anchor retention simulation ─────────────────────────────────────────────────

describe('language switch anchor retention', () => {
  it('restores to the same page index after re-pagination with same block IDs', () => {
    const blocks = Array.from({ length: 20 }, (_, i) => makeBlock(`b${i}`, i * 10))
    const heights = makeHeights(blocks, 100)
    const pageHeight = 350 // ~3 blocks per page

    const pages = computePages(blocks, heights, pageHeight)

    // Suppose user is on page 2 — anchor block is the first block of page 2
    const anchorBlockId = pages[2][0]

    // After language switch, blocks reload with same IDs but different text
    // Heights stay similar — re-paginate
    const newPages = computePages(blocks, heights, pageHeight)

    const restoredPage = findPageForBlock(newPages, anchorBlockId)
    expect(restoredPage).toBe(2)
  })

  it('falls back to position-based restoration when blockId is absent', () => {
    const oldBlocks = Array.from({ length: 10 }, (_, i) => makeBlock(`old${i}`, i * 10))
    const heights = makeHeights(oldBlocks, 100)
    const pageHeight = 350

    const oldPages = computePages(oldBlocks, heights, pageHeight)
    const anchorBlock = oldBlocks[oldPages[1][0] ? oldBlocks.findIndex((b) => b.id === oldPages[1][0]) : 0]
    const anchorPosition = anchorBlock?.position ?? 0

    // New blocks have different IDs (e.g. re-import) but same positions
    const newBlocks = Array.from({ length: 10 }, (_, i) => makeBlock(`new${i}`, i * 10))
    const newHeights = makeHeights(newBlocks, 100)
    const newPages = computePages(newBlocks, newHeights, pageHeight)

    // blockId lookup fails → fallback to position
    const byId = findPageForBlock(newPages, anchorBlock?.id ?? '')
    expect(byId).toBe(-1) // ID not found

    const byPos = findPageByBlockPosition(newPages, newBlocks, anchorPosition)
    expect(byPos).toBeGreaterThanOrEqual(0)
    expect(byPos).toBeLessThan(newPages.length)
  })
})
