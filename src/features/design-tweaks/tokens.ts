import { contrastRatio, formatOklch, type Oklch } from '@/features/design-tweaks/oklch'

// What the design tweaks panel may change. It only overrides design tokens (the CSS
// variables in src/styles/globals.css), never component styles, so a decision is a
// paste into globals.css and the panel can be deleted.

export type ThemeName = 'light' | 'dark'

/** Brand colours: they take the brand hue. */
const BRAND_VARS = [
  'primary',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'ring',
  'sidebar-primary',
  'sidebar-ring',
  'chart-1',
] as const

/** These equal --primary in globals.css, so they follow its lightness and strength too. */
const PRIMARY_LIKE: readonly string[] = ['primary', 'sidebar-primary', 'chart-1']

/** Page surfaces: they take the background tint and lightness. */
const SURFACE_VARS = ['background', 'card', 'popover', 'muted', 'border', 'input'] as const

/** Surfaces that move with the background lightness (borders keep their own). */
const LIGHTNESS_FOLLOWERS: readonly string[] = ['background', 'card', 'popover', 'muted']

export const COLOUR_VARS = [
  ...BRAND_VARS,
  ...SURFACE_VARS,
  'foreground',
  'muted-foreground',
  'primary-foreground',
] as const

export type ColourVar = (typeof COLOUR_VARS)[number]
export type Palette = Partial<Record<ColourVar, Oklch>>

/** The token values in globals.css, read from the page before any tweak is applied. */
export interface Baseline {
  light: Palette
  dark: Palette
  /** `--radius` in rem. */
  radiusRem: number | null
}

/** Per-theme tweaks. `undefined` means "as in globals.css". */
export interface ThemeTweaks {
  brandHue?: number
  primaryChroma?: number
  primaryLightness?: number
  surfaceTint?: number
  backgroundLightness?: number
}

export const displayFonts = {
  playfair: { label: 'Playfair Display (current)', stack: "'Playfair Display Variable', ui-serif, Georgia, serif" },
  'system-serif': { label: 'System serif (Georgia)', stack: "Georgia, 'Times New Roman', ui-serif, serif" },
  sans: { label: 'Same as the UI (Geist)', stack: "'Geist Variable', ui-sans-serif, system-ui, sans-serif" },
} as const

export type DisplayFont = keyof typeof displayFonts

export interface TweakState {
  light: ThemeTweaks
  dark: ThemeTweaks
  radiusRem?: number
  displayFont?: DisplayFont
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** The full palette for one theme with its tweaks applied. */
export function derivePalette(base: Palette, tweaks: ThemeTweaks): Palette {
  const result: Palette = { ...base }

  for (const name of BRAND_VARS) {
    const colour = base[name]
    if (!colour) continue
    const next = { ...colour }
    // Near-greys have no visible hue; leave them alone.
    if (tweaks.brandHue !== undefined && colour.c > 0.005) next.h = tweaks.brandHue
    if (PRIMARY_LIKE.includes(name)) {
      if (tweaks.primaryChroma !== undefined) next.c = tweaks.primaryChroma
      if (tweaks.primaryLightness !== undefined) next.l = tweaks.primaryLightness
    }
    result[name] = next
  }

  const background = base.background
  if (background) {
    // Scale every surface's chroma by the same factor, so their relative tints stay as designed.
    const tintFactor =
      tweaks.surfaceTint !== undefined && background.c > 0 ? tweaks.surfaceTint / background.c : undefined
    const lightnessShift =
      tweaks.backgroundLightness !== undefined ? tweaks.backgroundLightness - background.l : undefined
    for (const name of SURFACE_VARS) {
      const colour = base[name]
      if (!colour) continue
      const next = { ...colour }
      if (tintFactor !== undefined) next.c = colour.c * tintFactor
      if (lightnessShift !== undefined && LIGHTNESS_FOLLOWERS.includes(name))
        next.l = clamp01(colour.l + lightnessShift)
      result[name] = next
    }
  }
  return result
}

/** Only the variables whose value differs from globals.css, formatted for CSS. */
export function changedVars(base: Palette, effective: Palette): Record<string, string> {
  const changed: Record<string, string> = {}
  for (const name of COLOUR_VARS) {
    const before = base[name]
    const after = effective[name]
    if (before && after && formatOklch(before) !== formatOklch(after)) changed[`--${name}`] = formatOklch(after)
  }
  return changed
}

function block(selector: string, vars: Record<string, string>) {
  const lines = Object.entries(vars).map(([name, value]) => `  ${name}: ${value};`)
  return lines.length ? `${selector} {\n${lines.join('\n')}\n}` : ''
}

/**
 * CSS for the current tweaks. The page version overrides globals.css (unlayered, later in
 * the document); the export version is what to paste into globals.css.
 */
export function buildTweaksCss(baseline: Baseline, state: TweakState, mode: 'page' | 'export') {
  const light = changedVars(baseline.light, derivePalette(baseline.light, state.light))
  const dark = changedVars(baseline.dark, derivePalette(baseline.dark, state.dark))
  const radius: Record<string, string> = {}
  if (state.radiusRem !== undefined && state.radiusRem !== baseline.radiusRem)
    (mode === 'page' ? radius : light)['--radius'] = `${state.radiusRem}rem`

  const font = state.displayFont && state.displayFont !== 'playfair' ? displayFonts[state.displayFont].stack : null
  const fontCss =
    font === null
      ? ''
      : mode === 'page'
        ? `.font-display {\n  font-family: ${font};\n}`
        : `/* In the @theme inline block: */\n/* --font-display: ${font}; */`

  // On the page this comes after globals.css, so a bare :root would also beat .dark on <html>
  // and leak light-theme tweaks into dark mode. The radius isn't per theme, so it stays on :root.
  const lightSelector = mode === 'page' ? ':root:not(.dark),\n.light' : ':root,\n.light'
  return [block(':root', radius), block(lightSelector, light), block('.dark', dark), fontCss]
    .filter(Boolean)
    .join('\n\n')
}

/** Text/background pairs the UI relies on. WCAG AA needs 4.5:1 for normal-size text. */
export const contrastChecks: { label: string; text: ColourVar; surface: ColourVar }[] = [
  { label: 'Body text on page', text: 'foreground', surface: 'background' },
  { label: 'Secondary text on page', text: 'muted-foreground', surface: 'background' },
  { label: 'Button text on primary', text: 'primary-foreground', surface: 'primary' },
  { label: 'Links and prices on page', text: 'primary', surface: 'background' },
  { label: 'Links on cards', text: 'primary', surface: 'card' },
  { label: 'Chip text on secondary', text: 'secondary-foreground', surface: 'secondary' },
]

export const AA_NORMAL_TEXT = 4.5

export function checkContrast(palette: Palette) {
  return contrastChecks.flatMap((check) => {
    const text = palette[check.text]
    const surface = palette[check.surface]
    if (!text || !surface) return []
    const ratio = contrastRatio(text, surface)
    return [{ ...check, ratio, passes: ratio >= AA_NORMAL_TEXT }]
  })
}
