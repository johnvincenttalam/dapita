/** An OKLCH colour as written in globals.css: lightness 0–1, chroma, hue in degrees, optional alpha 0–1. */
export interface Oklch {
  l: number
  c: number
  h: number
  alpha?: number
}

const OKLCH_PATTERN = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)/

/** Parses `oklch(0.565 0.17 14)` or `oklch(1 0 0 / 8%)`. Returns null for anything else. */
export function parseOklch(value: string): Oklch | null {
  const match = OKLCH_PATTERN.exec(value)
  if (!match) return null
  const [, l = '0', lPercent, c = '0', h = '0', alpha, alphaPercent] = match
  return {
    l: Number(l) / (lPercent ? 100 : 1),
    c: Number(c),
    h: Number(h),
    ...(alpha === undefined ? {} : { alpha: Number(alpha) / (alphaPercent ? 100 : 1) }),
  }
}

const round = (value: number, digits: number) => Number(value.toFixed(digits))

export function formatOklch({ l, c, h, alpha }: Oklch) {
  const base = `${round(l, 3)} ${round(c, 3)} ${round(h, 1)}`
  return alpha === undefined ? `oklch(${base})` : `oklch(${base} / ${round(alpha * 100, 1)}%)`
}

/** Linear-light sRGB channels (0–1, clamped), via OKLab (Björn Ottosson's matrices). */
function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return [
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
}

/** WCAG relative luminance of an opaque colour. */
export function relativeLuminance(colour: Oklch) {
  const [r, g, b] = toLinearSrgb(colour)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio between two opaque colours (1–21). */
export function contrastRatio(a: Oklch, b: Oklch) {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}
