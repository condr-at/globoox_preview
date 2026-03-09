const MIN_FONT_SIZE_PX = 14
const MAX_FONT_SIZE_PX = 32
const MIN_LINE_HEIGHT_MULTIPLIER = 1.75
const MAX_LINE_HEIGHT_MULTIPLIER = 1.5

export function getLineHeightMultiplier(fontSize: number, scale = 1): number {
  const clampedFontSize = Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, fontSize))
  const progress = (clampedFontSize - MIN_FONT_SIZE_PX) / (MAX_FONT_SIZE_PX - MIN_FONT_SIZE_PX)
  const baseMultiplier =
    MIN_LINE_HEIGHT_MULTIPLIER +
    (MAX_LINE_HEIGHT_MULTIPLIER - MIN_LINE_HEIGHT_MULTIPLIER) * progress

  return baseMultiplier * scale
}

export function getLineHeightStyle(fontSize: number, scale = 1): string {
  return `${fontSize * getLineHeightMultiplier(fontSize, scale)}px`
}
