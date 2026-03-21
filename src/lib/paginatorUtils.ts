import { ContentBlock, ParagraphBlock } from './api'
import { getLineHeightStyle } from './readerTypography'
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

const PAGE_HEIGHT_BUFFER_PX = 6
const PARAGRAPH_FRAGMENT_LAST_CLASS = 'mb-2'
const PARAGRAPH_FRAGMENT_MIDDLE_CLASS = 'mb-0'

interface SplitResult {
  firstPart: string
  restPart: string
}

export interface ComputedPagesResult {
  pages: string[][]
  finalBlocks: ContentBlock[]
  fragmentMap: Map<string, string>
}

type MeasuredBlockRoots = Map<string, HTMLElement>

function hyphenateWord(word: string, lang: string): string[] {
  const hyphenator = hyphenators[lang] ?? hyphenators.en
  return hyphenator(word).split('\u00AD')
}

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
          items: [item],
          parentId: block.id,
          partIndex: index,
          isFirstPart: index === 0,
          isLastPart: index === block.items.length - 1,
          targetLangReady: block.targetLangReady,
          isTranslated: block.isTranslated,
          is_pending: block.is_pending,
        })
      })
    } else {
      result.push(block)
    }
  }
  return result
}

export function splitSentences(text: string): string[] {
  const protected_ = text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi, '$1\x00')
  const sentences: string[] = []
  const parts = protected_.split(/(?<=[.!?])\s+/)
  for (const part of parts) {
    const s = part.replace(/\x00/g, '.').trim()
    if (s) sentences.push(s)
  }
  return sentences.length > 0 ? sentences : [text]
}

function applyParagraphStyles(el: HTMLElement, fontSize: number, lang: string, isLastPart: boolean, lineHeightScale: number) {
  el.className = isLastPart ? PARAGRAPH_FRAGMENT_LAST_CLASS : PARAGRAPH_FRAGMENT_MIDDLE_CLASS
  if (fontSize) el.style.fontSize = `${fontSize}px`
  el.style.lineHeight = getLineHeightStyle(fontSize, lineHeightScale)
  el.setAttribute('lang', lang)
  el.style.hyphens = 'auto'
  el.style.setProperty('-webkit-hyphens', 'auto')
}

function createBlockElement(block: ContentBlock, fontSize: number, lang: string, lineHeightScale: number): HTMLElement {
  switch (block.type) {
    case 'paragraph': {
      const el = document.createElement('p')
      applyParagraphStyles(el, fontSize, lang, block.isLastPart ?? true, lineHeightScale)
      el.textContent = block.text
      return el
    }
    case 'heading': {
      const tag = `h${block.level}` as 'h1' | 'h2' | 'h3'
      const el = document.createElement(tag)
      el.className =
        block.level === 1
          ? 'text-xxl font-bold mb-3 mt-6'
          : block.level === 2
            ? 'text-xl font-semibold mb-2 mt-5'
            : 'text-lg font-semibold mb-2 mt-4'
      if (fontSize) el.style.fontSize = `${fontSize}px`
      el.textContent = block.text
      return el
    }
    case 'quote': {
      const el = document.createElement('blockquote')
      el.className = 'border-l-1 border-primary pl-3 my-4 italic text-foreground/80'
      if (fontSize) el.style.fontSize = `${fontSize}px`
      el.textContent = block.text
      return el
    }
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const el = document.createElement(tag)
      el.className = `${block.ordered ? 'list-decimal' : 'list-disc'} pl-6 ${(block.isLastPart ?? true) ? 'mb-3' : 'mb-1'} space-y-1`
      if (fontSize) el.style.fontSize = `${fontSize}px`
      if (block.ordered && block.partIndex !== undefined) {
        el.setAttribute('start', String(block.partIndex + 1))
      }
      for (const item of block.items) {
        const li = document.createElement('li')
        li.style.lineHeight = getLineHeightStyle(fontSize, lineHeightScale)
        li.style.hyphens = 'auto'
        li.style.setProperty('-webkit-hyphens', 'auto')
        li.textContent = item
        el.appendChild(li)
      }
      return el
    }
    case 'image': {
      const el = document.createElement('figure')
      el.className = 'my-4'
      return el
    }
    case 'hr': {
      const el = document.createElement('hr')
      el.className = 'my-5 border-border'
      return el
    }
  }
}

function wrapMeasuredElement(child: HTMLElement): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'flow-root'
  wrapper.appendChild(child)
  return wrapper
}

function cloneMeasuredWrapper(
  blockId: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): HTMLDivElement | null {
  const source = measuredBlockRoots?.get(blockId)
  if (!source) return null
  return source.cloneNode(true) as HTMLDivElement
}

function createMeasuredWrapper(
  block: ContentBlock,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  measuredBlockRoots?: MeasuredBlockRoots,
): HTMLDivElement {
  return cloneMeasuredWrapper(block.id, measuredBlockRoots) ?? wrapMeasuredElement(createBlockElement(block, fontSize, lang, lineHeightScale))
}

function createParagraphMeasuredWrapper(
  sourceBlockId: string,
  text: string,
  fontSize: number,
  lang: string,
  isLastPart: boolean,
  lineHeightScale: number,
  measuredBlockRoots?: MeasuredBlockRoots,
): HTMLDivElement {
  const clone = cloneMeasuredWrapper(sourceBlockId, measuredBlockRoots)
  if (clone) {
    const paragraph = clone.querySelector('p')
    if (paragraph) {
      applyParagraphStyles(paragraph, fontSize, lang, isLastPart, lineHeightScale)
      paragraph.textContent = text
      return clone
    }
  }

  const paragraph = document.createElement('p')
  applyParagraphStyles(paragraph, fontSize, lang, isLastPart, lineHeightScale)
  paragraph.textContent = text
  return wrapMeasuredElement(paragraph)
}

interface ProbeHandle {
  host: HTMLDivElement
  page: HTMLDivElement
}

function createProbe(
  containerRef: HTMLElement,
  effectiveHeight: number,
  lang: string,
  pageWidthPx?: number,
): ProbeHandle {
  const doc = containerRef.ownerDocument
  const host = doc.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.right = '0'
  host.style.top = '-20000px'
  host.style.visibility = 'hidden'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  host.style.overflow = 'hidden'

  const page = doc.createElement('div')
  page.className = 'container max-w-2xl mx-auto px-4 h-full'
  page.setAttribute('lang', lang)
  page.style.height = `${effectiveHeight}px`
  if (pageWidthPx && pageWidthPx > 0) {
    page.style.width = `${pageWidthPx}px`
  }
  page.style.overflowY = 'hidden'
  page.style.overflowX = 'hidden'

  host.appendChild(page)
  doc.body.appendChild(host)
  return { host, page }
}

function fitsProbe(probe: HTMLElement, effectiveHeight: number): boolean {
  const lastChild = probe.lastElementChild as HTMLElement | null
  const fitsByScroll = probe.scrollHeight <= effectiveHeight + 0.5
  if (!lastChild) return fitsByScroll
  const probeRect = probe.getBoundingClientRect()
  const lastRect = lastChild.getBoundingClientRect()
  const fitsByRect = lastRect.bottom <= probeRect.top + effectiveHeight + 0.5
  return fitsByRect && fitsByScroll
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char)
}

function trimSplitParts(text: string, splitIndex: number): SplitResult {
  return {
    firstPart: text.slice(0, splitIndex).trimEnd(),
    restPart: text.slice(splitIndex).trimStart(),
  }
}

function findSafeWordBoundary(text: string, preferredIndex: number): number {
  if (preferredIndex <= 0 || preferredIndex >= text.length) {
    return preferredIndex
  }

  let boundary = preferredIndex
  while (boundary > 0 && !isWhitespace(text[boundary - 1]!)) {
    boundary--
  }

  if (boundary <= 0) return preferredIndex

  const minAcceptedBoundary = Math.max(16, Math.floor(preferredIndex * 0.65))
  return boundary >= minAcceptedBoundary ? boundary : preferredIndex
}

function isTinyParagraphFragment(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  const words = trimmed.split(/\s+/).filter(Boolean)
  return words.length <= 2 || trimmed.length < 24
}

function fitParagraphByDom(
  text: string,
  probe: HTMLElement,
  effectiveHeight: number,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  sourceBlockId: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): SplitResult {
  const normalizedText = text.trim()
  if (!normalizedText) {
    return { firstPart: '', restPart: '' }
  }

  const wrapper = createParagraphMeasuredWrapper(sourceBlockId, '', fontSize, lang, false, lineHeightScale, measuredBlockRoots)
  const candidate = wrapper.querySelector('p') as HTMLParagraphElement | null
  if (!candidate) {
    return { firstPart: '', restPart: normalizedText }
  }
  probe.appendChild(wrapper)

  const fitsText = (candidateText: string, isLastPart = false): boolean => {
    candidate.className = isLastPart ? PARAGRAPH_FRAGMENT_LAST_CLASS : PARAGRAPH_FRAGMENT_MIDDLE_CLASS
    candidate.textContent = candidateText
    return fitsProbe(probe, effectiveHeight)
  }

  let low = 1
  let high = normalizedText.length
  let bestSplit = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const testText = normalizedText.slice(0, mid).trimEnd()
    if (!testText) {
      low = mid + 1
      continue
    }
    if (fitsText(testText, mid >= normalizedText.length)) {
      bestSplit = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (bestSplit <= 0) {
    probe.removeChild(wrapper)
    return { firstPart: '', restPart: normalizedText }
  }

  let bestResult = trimSplitParts(normalizedText, bestSplit)
  const safeBoundary = findSafeWordBoundary(normalizedText, bestSplit)
  if (safeBoundary > 0 && safeBoundary < normalizedText.length) {
    const safeResult = trimSplitParts(normalizedText, safeBoundary)
    if (safeResult.firstPart && fitsText(safeResult.firstPart, false)) {
      bestResult = safeResult
    }
  }

  if (!bestResult.restPart) {
    probe.removeChild(wrapper)
    return bestResult
  }

  const consumedChars = bestResult.firstPart.length
  let wordStart = consumedChars
  while (wordStart > 0 && !isWhitespace(normalizedText[wordStart - 1]!)) {
    wordStart--
  }
  let wordEnd = consumedChars
  while (wordEnd < normalizedText.length && !isWhitespace(normalizedText[wordEnd]!)) {
    wordEnd++
  }

  if (wordStart < consumedChars && wordEnd > consumedChars) {
    const prefix = normalizedText.slice(0, wordStart).trimEnd()
    const word = normalizedText.slice(wordStart, wordEnd)
    const suffix = normalizedText.slice(wordEnd).trimStart()
    const parts = hyphenateWord(word, lang)
    if (parts.length > 1) {
      let chunk = ''
      let bestHyphenated: SplitResult | null = null
      for (let i = 0; i < parts.length - 1; i++) {
        chunk += parts[i]
        const hyphenatedPrefix = prefix ? `${prefix} ${chunk}-` : `${chunk}-`
        if (fitsText(hyphenatedPrefix, false)) {
          bestHyphenated = {
            firstPart: hyphenatedPrefix,
            restPart: [parts.slice(i + 1).join(''), suffix].filter(Boolean).join(' ').trim(),
          }
        } else {
          break
        }
      }
      if (bestHyphenated) {
        bestResult = bestHyphenated
      }
    }
  }

  probe.removeChild(wrapper)
  return bestResult
}

function computePagesDom(
  blocks: ContentBlock[],
  pageHeight: number,
  containerRef: HTMLElement,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  minBlocksPerPage: number,
  measuredBlockRoots?: MeasuredBlockRoots,
  pageWidthPx?: number,
): ComputedPagesResult {
  const effectiveHeight = Math.max(1, pageHeight - PAGE_HEIGHT_BUFFER_PX)
  const pages: string[][] = []
  const finalBlocks: ContentBlock[] = []
  const fragmentMap = new Map<string, string>()
  const probeHandle = createProbe(containerRef, effectiveHeight, lang, pageWidthPx)
  const probe = probeHandle.page

  let currentPage: string[] = []

  const resetProbe = () => {
    probe.replaceChildren()
  }

  const pushCurrentPage = () => {
    if (currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      resetProbe()
    }
  }

  try {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block.type !== 'paragraph') {
        const node = createMeasuredWrapper(block, fontSize, lang, lineHeightScale, measuredBlockRoots)
        probe.appendChild(node)
        if (fitsProbe(probe, effectiveHeight) || currentPage.length < minBlocksPerPage) {
          // Heading lookahead: if heading fits but the next block won't, push heading to next page
          if (block.type === 'heading' && currentPage.length >= minBlocksPerPage) {
            const nextBlock = blocks[i + 1]
            if (nextBlock && (nextBlock.type === 'paragraph' || nextBlock.type === 'quote')) {
              const nextNode = createMeasuredWrapper(nextBlock, fontSize, lang, lineHeightScale, measuredBlockRoots)
              probe.appendChild(nextNode)
              const nextFits = fitsProbe(probe, effectiveHeight)
              probe.removeChild(nextNode)
              if (!nextFits) {
                probe.removeChild(node)
                pushCurrentPage()
                probe.appendChild(node)
              }
            }
          }
          currentPage.push(block.id)
          finalBlocks.push(block)
          continue
        }

        probe.removeChild(node)
        pushCurrentPage()
        probe.appendChild(node)
        currentPage.push(block.id)
        finalBlocks.push(block)
        continue
      }

      let remainingText = block.text
      let partIndex = block.partIndex ?? 0
      const allSentences = splitSentences(block.text)

      while (remainingText.trim()) {
        const wholeNode = createParagraphMeasuredWrapper(
          block.id,
          remainingText,
          fontSize,
          lang,
          block.isLastPart ?? true,
          lineHeightScale,
          measuredBlockRoots,
        )
        probe.appendChild(wholeNode)
        if (fitsProbe(probe, effectiveHeight)) {
          const finalId = partIndex === (block.partIndex ?? 0) ? block.id : `${block.id}-part-${partIndex}`
          const isFirstPart = (block.isFirstPart ?? true) && partIndex === (block.partIndex ?? 0)
          const finalBlock: ParagraphBlock & { sentenceIndex: number } = {
            ...block,
            id: finalId,
            text: remainingText,
            parentId: block.parentId ?? block.id,
            partIndex,
            isFirstPart,
            isLastPart: true,
            sentenceIndex: Math.min(allSentences.length - 1, 0),
          }
          if (finalId !== block.id) {
            fragmentMap.set(finalId, finalBlock.parentId!)
          }
          currentPage.push(finalBlock.id)
          finalBlocks.push(finalBlock)
          remainingText = ''
          break
        }
        probe.removeChild(wholeNode)

        const split = fitParagraphByDom(
          remainingText,
          probe,
          effectiveHeight,
          fontSize,
          lang,
          lineHeightScale,
          block.id,
          measuredBlockRoots,
        )
        const forcedFirstWord = !split.firstPart.trim()
        const firstText = forcedFirstWord
          ? remainingText.split(/\s+/).slice(0, 1).join(' ')
          : split.firstPart.trim()
        const restText = forcedFirstWord
          ? remainingText.split(/\s+/).slice(1).join(' ')
          : split.restPart.trim()

        if (!firstText) {
          pushCurrentPage()
          continue
        }

        if (currentPage.length > 0 && restText && isTinyParagraphFragment(firstText)) {
          pushCurrentPage()
          continue
        }

        const isFirstPart = (block.isFirstPart ?? true) && partIndex === (block.partIndex ?? 0)
        const isLastPart = (block.isLastPart ?? true) && !restText
        const fragmentId = `${block.id}-part-${partIndex}`

        const offsetInBlock = block.text.length - remainingText.length
        let sentenceIndex = 0
        let runningLen = 0
        for (let si = 0; si < allSentences.length; si++) {
          if (runningLen >= offsetInBlock) {
            sentenceIndex = si
            break
          }
          runningLen += allSentences[si].length + 1
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

        const fragmentNode = createParagraphMeasuredWrapper(
          block.id,
          fragmentBlock.text,
          fontSize,
          lang,
          fragmentBlock.isLastPart ?? false,
          lineHeightScale,
          measuredBlockRoots,
        )
        probe.appendChild(fragmentNode)
        currentPage.push(fragmentId)
        finalBlocks.push(fragmentBlock)
        fragmentMap.set(fragmentId, fragmentBlock.parentId!)

        if (restText) {
          pushCurrentPage()
        }

        remainingText = restText
        partIndex++
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    return { pages, finalBlocks, fragmentMap }
  } finally {
    probeHandle.host.remove()
  }
}

function measureTextHeight(text: string, tempEl: HTMLElement): number {
  tempEl.textContent = text
  return tempEl.offsetHeight
}

function measureParagraphFragmentHeight(
  text: string,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  containerRef: HTMLElement,
  isLastPart: boolean,
): number {
  const temp = document.createElement('p')
  applyParagraphStyles(temp, fontSize, lang, isLastPart, lineHeightScale)
  temp.style.position = 'absolute'
  temp.style.visibility = 'hidden'
  temp.style.width = '100%'
  containerRef.appendChild(temp)
  const height = measureTextHeight(text, temp)
  containerRef.removeChild(temp)
  return height
}

function splitParagraphByHeight(
  text: string,
  availableHeight: number,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  containerRef: HTMLElement,
): SplitResult {
  const words = text.split(/\s+/)
  if (words.length <= 1) {
    return { firstPart: text, restPart: '' }
  }

  const temp = document.createElement('p')
  applyParagraphStyles(temp, fontSize, lang, false, lineHeightScale)
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
    temp.className = mid === words.length ? PARAGRAPH_FRAGMENT_LAST_CLASS : PARAGRAPH_FRAGMENT_MIDDLE_CLASS
    const h = measureTextHeight(testText, temp)

    if (h <= availableHeight) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  let firstPart = words.slice(0, best).join(' ')
  const restWords = words.slice(best)

  if (best < words.length && best > 0 && best < words.length - 1) {
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

  containerRef.removeChild(temp)
  return { firstPart, restPart: restWords.join(' ') }
}

function computePagesFallback(
  blocks: ContentBlock[],
  blockHeights: Map<string, number>,
  pageHeight: number,
  containerRef: HTMLElement | null,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  minBlocksPerPage: number,
): ComputedPagesResult {
  const effectiveHeight = containerRef ? Math.max(1, pageHeight - PAGE_HEIGHT_BUFFER_PX) : pageHeight
  const pages: string[][] = []
  let currentPage: string[] = []
  let currentHeight = 0
  const finalBlocks: ContentBlock[] = []
  const fragmentMap = new Map<string, string>()

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const h = blockHeights.get(block.id) ?? 48

    if (block.type === 'heading' && i < blocks.length - 1) {
      const nextBlock = blocks[i + 1]
      let nextH = blockHeights.get(nextBlock.id) ?? 48
      if (nextBlock.type === 'paragraph' && containerRef) {
        nextH = Math.min(nextH, 60)
      }
      if (currentHeight + h + nextH > effectiveHeight && currentPage.length > 0) {
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
      const allSentences = splitSentences(block.text)

      while (remainingText.trim()) {
        if (effectiveHeight - currentHeight <= 0 && currentPage.length > 0) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
        }

        const split = splitParagraphByHeight(
          remainingText,
          effectiveHeight - currentHeight,
          fontSize,
          lang,
          lineHeightScale,
          containerRef,
        )

        if (!split.firstPart.trim() && currentPage.length > 0) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
          continue
        }

        const forcedFirstWord = !split.firstPart.trim()
        const firstText = split.firstPart.trim() || remainingText.split(/\s+/).slice(0, 1).join(' ')
        const restText = forcedFirstWord ? remainingText.split(/\s+/).slice(1).join(' ') : split.restPart.trim()

        if (currentPage.length > 0 && restText && isTinyParagraphFragment(firstText)) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
          continue
        }

        const fragmentId = `${block.id}-part-${partIndex}`
        const isFirstPart = (block.isFirstPart ?? true) && partIndex === 0
        const isLastPart = (block.isLastPart ?? true) && !restText

        const offsetInBlock = block.text.length - remainingText.length
        let sentenceIndex = 0
        let runningLen = 0
        for (let si = 0; si < allSentences.length; si++) {
          if (runningLen >= offsetInBlock) {
            sentenceIndex = si
            break
          }
          runningLen += allSentences[si].length + 1
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

        if (restText) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
        } else {
          currentHeight += measureParagraphFragmentHeight(firstText, fontSize, lang, lineHeightScale, containerRef, isLastPart)
        }

        remainingText = restText
        partIndex++
      }
    } else {
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

export function computePages(
  blocks: ContentBlock[],
  blockHeights: Map<string, number>,
  pageHeight: number,
  containerRef: HTMLElement | null,
  fontSize: number,
  lang: string,
  lineHeightScale = 1,
  minBlocksPerPage = 1,
  measuredBlockRoots?: MeasuredBlockRoots,
  pageWidthPx?: number,
): ComputedPagesResult {
  if (blocks.length === 0 || pageHeight <= 0) {
    return { pages: [], finalBlocks: [], fragmentMap: new Map() }
  }

  if (containerRef) {
    return computePagesDom(
      blocks,
      pageHeight,
      containerRef,
      fontSize,
      lang,
      lineHeightScale,
      minBlocksPerPage,
      measuredBlockRoots,
      pageWidthPx,
    )
  }

  return computePagesFallback(blocks, blockHeights, pageHeight, containerRef, fontSize, lang, lineHeightScale, minBlocksPerPage)
}

export function findPageForBlockAndSentence(
  pages: string[][],
  finalBlocks: ContentBlock[],
  blockId: string,
  targetSentenceIndex: number,
  fragmentMap?: Map<string, string>,
): number {
  const sentenceMap = new Map<string, number>()
  for (const block of finalBlocks) {
    const parentId = block.parentId ?? block.id
    const sentenceIndex = 'sentenceIndex' in block ? block.sentenceIndex : undefined
    if (parentId === blockId && typeof sentenceIndex === 'number') {
      sentenceMap.set(block.id, sentenceIndex)
    }
  }

  if (sentenceMap.size === 0) {
    return findPageForBlock(pages, blockId, fragmentMap)
  }

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
  return findPageForBlock(pages, blockId, fragmentMap)
}

export function findPageForBlock(
  pages: string[][],
  blockId: string,
  fragmentMap?: Map<string, string>,
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
