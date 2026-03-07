import type { ContentBlock } from '@/lib/api'

const NON_TRANSLATABLE_TYPES = new Set<ContentBlock['type']>(['image', 'hr'])

export function isTranslatableBlock(block: ContentBlock): boolean {
  return !NON_TRANSLATABLE_TYPES.has(block.type)
}

export function hasTargetLangText(block: ContentBlock): boolean {
  if (!isTranslatableBlock(block)) return true
  return block.targetLangReady === true
}

export function isBlockPendingForActiveLang(block: ContentBlock, pendingBlockIds?: Set<string>): boolean {
  const blockId = block.parentId ?? block.id
  return isTranslatableBlock(block) && (!hasTargetLangText(block) || !!pendingBlockIds?.has(blockId))
}
