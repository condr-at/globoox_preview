import { ContentBlock } from './api'

/**
 * Split blocks into pages so each page fits within `pageHeight` pixels.
 * A block is never split — if it doesn't fit it starts a new page.
 * `minBlocksPerPage` (default 1) ensures at least one block per page to
 * prevent infinite loops with blocks taller than the page.
 */
export function computePages(
  blocks: ContentBlock[],
  blockHeights: Map<string, number>,
  pageHeight: number,
  minBlocksPerPage = 1,
): string[][] {
  if (blocks.length === 0 || pageHeight <= 0) return []

  const pages: string[][] = []
  let currentPage: string[] = []
  let currentHeight = 0

  for (const block of blocks) {
    const h = blockHeights.get(block.id) ?? 80

    const wouldOverflow = currentHeight + h > pageHeight
    const canStartNewPage = currentPage.length >= minBlocksPerPage

    if (wouldOverflow && canStartNewPage) {
      pages.push(currentPage)
      currentPage = [block.id]
      currentHeight = h
    } else {
      currentPage.push(block.id)
      currentHeight += h
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

/**
 * Return the page index that contains `blockId`, or -1 if not found.
 */
export function findPageForBlock(pages: string[][], blockId: string): number {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].includes(blockId)) return i
  }
  return -1
}

/**
 * Find the page index whose first block has a `position` >= `targetPosition`.
 * Used as fallback when `blockId` is no longer present (e.g. content re-imported).
 * Returns the last page if no page qualifies.
 */
export function findPageByBlockPosition(
  pages: string[][],
  blocks: ContentBlock[],
  targetPosition: number,
): number {
  const posMap = new Map(blocks.map((b) => [b.id, b.position]))

  for (let i = 0; i < pages.length; i++) {
    const firstId = pages[i][0]
    const pos = posMap.get(firstId) ?? -1
    if (pos >= targetPosition) return i
  }

  return Math.max(0, pages.length - 1)
}
