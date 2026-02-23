import { ContentBlock, ParagraphBlock } from './api'
import { hyphenateSync as hyphenRu } from 'hyphen/ru'
import { hyphenateSync as hyphenEn } from 'hyphen/en-us'
import { hyphenateSync as hyphenFr } from 'hyphen/fr'
import { hyphenateSync as hyphenDe } from 'hyphen/de'
import { hyphenateSync as hyphenEs } from 'hyphen/es'


const hyphenators: Record<string, (text: string) => string> = {
  ru: hyphenRu,
  en: hyphenEn,
  fr: hyphenFr,
  de: hyphenDe,
  es: hyphenEs,
}

function hyphenateWord(word: string, lang: string): string[] {
  const hyphenator = hyphenators[lang] ?? hyphenators['en']
  return hyphenator(word).split('\u00AD')
}

/**
 * Pre-split lists into separate items for pagination
 */
export function normalizeBlocks(blocks: ContentBlock[]): ContentBlock[] {
  const result: ContentBlock[] = []
  for (const block of blocks) {
    if (block.type === 'list') {
      block.items.forEach((item, index) => {
        result.push({
          id: `${block.id}-item-${index}`,
          type: 'list',
          position: block.position,
          ordered: block.ordered,
          items: [item], // single item
          parentId: block.id,
          partIndex: index,
          isFirstPart: index === 0,
          isLastPart: index === block.items.length - 1,
        })
      })
    } else {
      result.push(block)
    }
  }
  return result
}

interface SplitResult {
  firstPart: string
  restPart: string
}

function measureTextHeight(text: string, tempEl: HTMLElement): number {
  tempEl.textContent = text
  return tempEl.offsetHeight
}

/**
 * Binary search to find how many words fit into `availableHeight`.
 * Includes hyphenation logic for the border word.
 */
function splitParagraphByHeight(
  text: string,
  availableHeight: number,
  blockId: string,
  fontSize: number,
  lang: string,
  containerRef: HTMLElement
): SplitResult {
  const words = text.split(/\s+/)
  if (words.length <= 1) {
    return { firstPart: text, restPart: '' }
  }

  const temp = document.createElement('p')
  temp.className = 'mb-0 leading-relaxed' // No bottom margin for fragments except last, but we measure tight!
  if (fontSize) temp.style.fontSize = `${fontSize}px`
  temp.setAttribute('lang', lang)
  temp.style.hyphens = 'auto'
  temp.style.setProperty('-webkit-hyphens', 'auto')
  temp.style.position = 'absolute'
  temp.style.visibility = 'hidden'
  temp.style.width = '100%'

  containerRef.appendChild(temp)

  let low = 0
  let high = words.length
  let best = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const testText = words.slice(0, mid).join(' ')
    const h = measureTextHeight(testText, temp)

    if (h <= availableHeight) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  let firstPart = words.slice(0, best).join(' ')
  let restWords = words.slice(best)

  // Try to hyphenate the very next word to fit slightly more on the page
  if (best < words.length && best > 0) {
    // Only if not the very last word of the paragraph
    if (best < words.length - 1) {
      const nextWord = words[best]
      const parts = hyphenateWord(nextWord, lang)

      if (parts.length > 1) {
        let maxFittingSyllables = 0
        let currentSyllableStr = ''
        for (let i = 0; i < parts.length - 1; i++) {
          currentSyllableStr += parts[i]
          const testStr = `${firstPart} ${currentSyllableStr}-`
          const h = measureTextHeight(testStr, temp)
          if (h <= availableHeight) {
            maxFittingSyllables = i + 1
          } else {
            break
          }
        }

        if (maxFittingSyllables > 0) {
          const fittingSyllables = parts.slice(0, maxFittingSyllables).join('')
          const remainingSyllables = parts.slice(maxFittingSyllables).join('')
          firstPart += ` ${fittingSyllables}-`
          restWords[0] = remainingSyllables
        }
      }
    }
  }

  containerRef.removeChild(temp)

  return {
    firstPart: firstPart,
    restPart: restWords.join(' '),
  }
}

export interface ComputedPagesResult {
  pages: string[][]
  finalBlocks: ContentBlock[]
  fragmentMap: Map<string, string> // maps fragmentId -> parentId
}

/**
 * Split text into sentences using punctuation boundaries.
 * Handles common abbreviations to avoid false splits (Mr., Dr., etc.).
 */
export function splitSentences(text: string): string[] {
  // Protect common abbreviations by replacing their periods temporarily
  const protected_ = text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi, '$1\x00')

  const sentences: string[] = []
  // Split on sentence-ending punctuation followed by space/end
  const parts = protected_.split(/(?<=[.!?])\s+/)
  for (const part of parts) {
    const s = part.replace(/\x00/g, '.').trim()
    if (s) sentences.push(s)
  }
  return sentences.length > 0 ? sentences : [text]
}

/**
 * Find the page index containing a fragment with the given blockId and
 * the highest sentenceIndex that is <= targetSentenceIndex.
 * Falls back to findPageForBlock if no sentence-level data is available.
 */
export function findPageForBlockAndSentence(
  pages: string[][],
  finalBlocks: ContentBlock[],
  blockId: string,
  targetSentenceIndex: number,
  fragmentMap?: Map<string, string>,
): number {
  // Build map: fragmentId -> sentenceIndex for fragments of the target block
  const sentenceMap = new Map<string, number>()
  for (const block of finalBlocks) {
    const parentId = block.parentId ?? block.id
    if (parentId === blockId && (block as any).sentenceIndex != null) {
      sentenceMap.set(block.id, (block as any).sentenceIndex as number)
    }
  }

  if (sentenceMap.size === 0) {
    // No sentence data: fall back to block-level search
    return findPageForBlock(pages, blockId, fragmentMap)
  }

  // Find the page whose fragment has the best (largest ≤ target) sentenceIndex
  let bestPage = -1
  let bestSentIdx = -1

  for (let i = 0; i < pages.length; i++) {
    for (const id of pages[i]) {
      const sIdx = sentenceMap.get(id)
      if (sIdx == null) continue
      if (sIdx <= targetSentenceIndex && sIdx > bestSentIdx) {
        bestSentIdx = sIdx
        bestPage = i
      }
    }
  }

  if (bestPage >= 0) return bestPage

  // Nothing matched: fall back to any fragment of the block
  return findPageForBlock(pages, blockId, fragmentMap)
}

/**
 * Split blocks into pages so each page fits within `pageHeight` pixels.
 */
export function computePages(
  blocks: ContentBlock[],
  blockHeights: Map<string, number>,
  pageHeight: number,
  containerRef: HTMLElement | null,
  fontSize: number,
  lang: string,
  minBlocksPerPage = 1,
): ComputedPagesResult {
  if (blocks.length === 0 || pageHeight <= 0) {
    return { pages: [], finalBlocks: [], fragmentMap: new Map() }
  }

  const effectiveHeight = pageHeight


  const pages: string[][] = []
  let currentPage: string[] = []
  let currentHeight = 0
  const finalBlocks: ContentBlock[] = []
  const fragmentMap = new Map<string, string>()

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const originalH = blockHeights.get(block.id) ?? 48
    let h = originalH

    // Heading keep-with-next logic:
    // If it's a heading and it fits, check if next block fits too
    if (block.type === 'heading' && i < blocks.length - 1) {
      const nextBlock = blocks[i + 1]
      let nextH = blockHeights.get(nextBlock.id) ?? 48
      if (nextBlock.type === 'paragraph' && containerRef) {
        nextH = Math.min(nextH, 60)
      }
      if (currentHeight + h + nextH > effectiveHeight && currentPage.length > 0) {
        // Start new page early to avoid orphaned heading
        pages.push(currentPage)
        currentPage = []
        currentHeight = 0
      }
    }

    const wouldOverflow = currentHeight + h > effectiveHeight
    const canStartNewPage = currentPage.length >= minBlocksPerPage

    if (!wouldOverflow || !canStartNewPage) {
      currentPage.push(block.id)
      finalBlocks.push(block)
      currentHeight += h
      continue
    }

    if (block.type === 'paragraph' && containerRef) {
      let remainingText = block.text
      let partIndex = block.partIndex ?? 0

      // Track sentence index: first sentence of each fragment in the original block
      const allSentences = splitSentences(block.text)

      while (remainingText.trim()) {
        const availableHeight = effectiveHeight - currentHeight

        // If we have literally negative or 0 room, we MUST start a new page
        if (availableHeight <= 0) {
          if (currentPage.length > 0) {
            pages.push(currentPage)
            currentPage = []
            currentHeight = 0
          }
          // Now on empty page, we assume it'll take full effectiveHeight
        }

        const freshAvailHeight = effectiveHeight - currentHeight

        // Split text
        const split = splitParagraphByHeight(
          remainingText,
          freshAvailHeight,
          block.id,
          fontSize,
          lang,
          containerRef
        )

        // If nothing fits (e.g. single giant word or very low height) and we're not empty
        if (!split.firstPart.trim() && currentPage.length > 0) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
          continue // retry splitting remaining text on new page
        }

        // If nothing fits even on an empty page, force at least one word to avoid infinite loop
        const forcedFirstWord = !split.firstPart.trim()
        const firstText = split.firstPart.trim() || remainingText.split(/\s+/).slice(0, 1).join(' ')
        const restText = forcedFirstWord
          ? remainingText.split(/\s+/).slice(1).join(' ')
          : split.restPart.trim()

        const fragmentId = `${block.id}-part-${partIndex}`
        const isFirstPart = (block.isFirstPart ?? true) && partIndex === 0
        const isLastPart = (block.isLastPart ?? true) && !restText

        // Compute sentenceIndex: how many sentences of the original block precede this fragment
        const offsetInBlock = block.text.length - remainingText.length
        let sentenceIndex = 0
        let runningLen = 0
        for (let si = 0; si < allSentences.length; si++) {
          if (runningLen >= offsetInBlock) {
            sentenceIndex = si
            break
          }
          runningLen += allSentences[si].length + 1 // +1 for separator space
          sentenceIndex = si + 1
        }
        sentenceIndex = Math.min(sentenceIndex, allSentences.length - 1)

        const fragmentBlock: ParagraphBlock & { sentenceIndex: number } = {
          ...block,
          id: fragmentId,
          text: firstText,
          parentId: block.parentId ?? block.id,
          partIndex,
          isFirstPart,
          isLastPart,
          sentenceIndex,
        }

        fragmentMap.set(fragmentId, fragmentBlock.parentId!)
        finalBlocks.push(fragmentBlock)
        currentPage.push(fragmentId)

        // Find how much height the fragment took to add it maybe?
        // Since it filled the page or we are going to break anyway, if not last part:
        if (restText) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
        } else {
          const temp = document.createElement('p')
          const mbClass = isLastPart ? 'mb-5' : 'mb-0'
          temp.className = `${mbClass} leading-relaxed`
          if (fontSize) temp.style.fontSize = `${fontSize}px`
          temp.setAttribute('lang', lang)
          temp.style.hyphens = 'auto'
          temp.style.setProperty('-webkit-hyphens', 'auto')
          temp.style.position = 'absolute'
          temp.style.visibility = 'hidden'
          temp.style.width = '100%'
          containerRef.appendChild(temp)
          const finalH = measureTextHeight(firstText, temp)
          containerRef.removeChild(temp)

          currentHeight += finalH
        }

        remainingText = restText
        partIndex++
      }
    } else {
      // Not a paragraph or no container to split
      pages.push(currentPage)
      currentPage = [block.id]
      finalBlocks.push(block)
      currentHeight = h
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return { pages, finalBlocks, fragmentMap }
}

/**
 * Return the page index that contains `blockId`, or -1 if not found.
 */
export function findPageForBlock(
  pages: string[][],
  blockId: string,
  fragmentMap?: Map<string, string>
): number {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].includes(blockId)) return i
  }

  if (fragmentMap) {
    for (let i = 0; i < pages.length; i++) {
      for (const id of pages[i]) {
        if (fragmentMap.get(id) === blockId || fragmentMap.get(id) === fragmentMap.get(blockId)) {
          return i
        }
      }
    }
  }
  return -1
}

/**
 * Find the page index that best contains `targetPosition`.
 */
export function findPageByBlockPosition(
  pages: string[][],
  blocks: ContentBlock[],
  targetPosition: number,
): number {
  const posMap = new Map(blocks.map((b) => [b.id, b.position]))

  let bestPage = 0
  for (let i = 0; i < pages.length; i++) {
    const firstId = pages[i][0]
    const pos = posMap.get(firstId) ?? -1
    if (pos <= targetPosition) {
      bestPage = i
    } else {
      break
    }
  }

  return bestPage
}
