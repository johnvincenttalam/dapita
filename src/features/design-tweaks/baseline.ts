import { parseOklch } from '@/features/design-tweaks/oklch'
import { COLOUR_VARS, type Baseline, type Palette } from '@/features/design-tweaks/tokens'

/** The `<style>` element holding the live overrides. */
export const TWEAKS_STYLE_ID = 'design-tweaks'

function readPalette(themeClass: 'light' | 'dark'): { palette: Palette; radius: string } {
  // A hidden probe with the theme class picks up that theme's tokens whatever the page theme is.
  const probe = document.createElement('div')
  probe.className = themeClass
  probe.hidden = true
  document.body.append(probe)
  const styles = getComputedStyle(probe)
  const palette: Palette = {}
  for (const name of COLOUR_VARS) {
    const colour = parseOklch(styles.getPropertyValue(`--${name}`))
    if (colour) palette[name] = colour
  }
  const radius = styles.getPropertyValue('--radius')
  probe.remove()
  return { palette, radius }
}

/**
 * Reads the token values from globals.css as the page has them, with the panel's own
 * overrides switched off while reading. Nothing is duplicated from the stylesheet.
 */
export function readBaseline(): Baseline {
  const overrides = document.getElementById(TWEAKS_STYLE_ID) as HTMLStyleElement | null
  if (overrides) overrides.disabled = true
  try {
    const light = readPalette('light')
    const dark = readPalette('dark')
    const radius = /^\s*([\d.]+)rem\s*$/.exec(light.radius)?.[1]
    return { light: light.palette, dark: dark.palette, radiusRem: radius ? Number(radius) : null }
  } finally {
    if (overrides) overrides.disabled = false
  }
}

/** Writes `css` into the overrides element, appended last in <head> so it wins over globals.css. */
export function applyTweaksCss(css: string) {
  let element = document.getElementById(TWEAKS_STYLE_ID) as HTMLStyleElement | null
  if (!css) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('style')
    element.id = TWEAKS_STYLE_ID
    document.head.append(element)
  }
  element.textContent = css
}
