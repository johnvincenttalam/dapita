import { describe, expect, it } from 'vitest'

import { contrastRatio, formatOklch, parseOklch } from '@/features/design-tweaks/oklch'
import {
  buildTweaksCss,
  changedVars,
  checkContrast,
  derivePalette,
  type Baseline,
  type Palette,
} from '@/features/design-tweaks/tokens'

const white = { l: 1, c: 0, h: 0 }
const black = { l: 0, c: 0, h: 0 }

// Values copied from the light theme in globals.css.
const light: Palette = {
  primary: { l: 0.565, c: 0.17, h: 14 },
  'sidebar-primary': { l: 0.565, c: 0.17, h: 14 },
  secondary: { l: 0.94, c: 0.024, h: 10 },
  ring: { l: 0.62, c: 0.15, h: 14 },
  background: { l: 0.975, c: 0.008, h: 40 },
  card: { l: 0.997, c: 0.002, h: 40 },
  border: { l: 0.91, c: 0.014, h: 30 },
  foreground: { l: 0.24, c: 0.02, h: 285 },
  'primary-foreground': { l: 0.99, c: 0.005, h: 14 },
  popover: { l: 1, c: 0, h: 0 },
}
const baseline: Baseline = { light, dark: {}, radiusRem: 0.75 }

describe('oklch helpers', () => {
  it('parses the forms used in globals.css and formats them back', () => {
    expect(parseOklch(' oklch(0.565 0.17 14)')).toEqual({ l: 0.565, c: 0.17, h: 14 })
    expect(parseOklch('oklch(1 0 0 / 8%)')).toEqual({ l: 1, c: 0, h: 0, alpha: 0.08 })
    expect(parseOklch('#ffffff')).toBeNull()
    expect(formatOklch({ l: 1, c: 0, h: 0, alpha: 0.08 })).toBe('oklch(1 0 0 / 8%)')
  })

  it('computes WCAG contrast', () => {
    expect(contrastRatio(white, black)).toBeCloseTo(21, 0)
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5)
  })
})

describe('derivePalette', () => {
  it('applies the brand hue to coloured brand tokens only', () => {
    const result = derivePalette({ ...light, accent: { l: 0.97, c: 0.001, h: 12 } }, { brandHue: 300 })
    expect(result.primary?.h).toBe(300)
    expect(result.secondary?.h).toBe(300)
    expect(result.ring?.h).toBe(300)
    expect(result.accent?.h).toBe(12) // near-grey: unchanged
    expect(result.background?.h).toBe(40)
  })

  it('keeps tokens that equal --primary in step with it', () => {
    const result = derivePalette(light, { primaryChroma: 0.2, primaryLightness: 0.5 })
    expect(result.primary).toMatchObject({ l: 0.5, c: 0.2 })
    expect(result['sidebar-primary']).toMatchObject({ l: 0.5, c: 0.2 })
    expect(result.ring).toMatchObject({ l: 0.62, c: 0.15 })
  })

  it('scales surface tints together and shifts surface lightness but not borders', () => {
    const result = derivePalette(light, { surfaceTint: 0.016, backgroundLightness: 0.955 })
    expect(result.background?.c).toBeCloseTo(0.016)
    expect(result.border?.c).toBeCloseTo(0.028)
    expect(result.background?.l).toBeCloseTo(0.955)
    expect(result.card?.l).toBeCloseTo(0.977)
    expect(result.border?.l).toBe(0.91)
  })
})

describe('CSS output', () => {
  it('lists only changed tokens', () => {
    expect(changedVars(light, derivePalette(light, {}))).toEqual({})
    expect(Object.keys(changedVars(light, derivePalette(light, { primaryChroma: 0.2 })))).toEqual([
      '--primary',
      '--sidebar-primary',
    ])
  })

  it('builds page overrides and a paste-ready export', () => {
    const state = { light: { brandHue: 300 }, dark: {}, radiusRem: 1, displayFont: 'sans' as const }
    const page = buildTweaksCss(baseline, state, 'page')
    // Unlayered and later than globals.css, a bare :root would beat .dark on <html>.
    expect(page).toContain(':root:not(.dark),\n.light {\n  --primary: oklch(0.565 0.17 300);')
    expect(page).toContain(':root {\n  --radius: 1rem;\n}')
    expect(page).toContain(".font-display {\n  font-family: 'Geist Variable'")
    expect(page).not.toContain('.dark {')

    const exported = buildTweaksCss(baseline, state, 'export')
    expect(exported).toContain(':root,\n.light {')
    expect(exported).toContain('--radius: 1rem;')
    expect(exported).toContain('/* --font-display: ')
    expect(exported).not.toContain('.font-display')
  })

  it('is empty when nothing changed', () => {
    expect(buildTweaksCss(baseline, { light: {}, dark: {}, radiusRem: 0.75 }, 'page')).toBe('')
  })
})

describe('checkContrast', () => {
  it('passes the shipped palette and flags a too-light primary', () => {
    expect(checkContrast(light).every((check) => check.passes)).toBe(true)
    const washedOut = checkContrast(derivePalette(light, { primaryLightness: 0.8 }))
    expect(washedOut.find((check) => check.label === 'Button text on primary')?.passes).toBe(false)
  })
})
