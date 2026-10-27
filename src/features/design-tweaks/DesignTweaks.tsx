import { CheckIcon, CopyIcon, PaletteIcon, RotateCcwIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { applyTweaksCss, readBaseline } from '@/features/design-tweaks/baseline'
import { formatOklch } from '@/features/design-tweaks/oklch'
import { useTweaksStore } from '@/features/design-tweaks/store'
import {
  buildTweaksCss,
  checkContrast,
  derivePalette,
  displayFonts,
  type Baseline,
  type DisplayFont,
  type ThemeName,
} from '@/features/design-tweaks/tokens'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

// TEMPORARY design tool, mounted in src/app/App.tsx in development. Delete this folder and its
// mount in src/app/App.tsx once the design is signed off.

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
}

function SliderField({ label, value, min, max, step, format, onChange }: SliderFieldProps) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <output htmlFor={id} className="type-meta text-muted-foreground">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-primary"
      />
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="type-eyebrow text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

const number = (digits: number) => (value: number) => value.toFixed(digits)

function TweaksPanel({ baseline, onClose }: { baseline: Baseline; onClose: () => void }) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const theme: ThemeName = resolvedTheme
  const store = useTweaksStore()
  const tweaks = store[theme]
  const base = baseline[theme]
  const palette = useMemo(() => derivePalette(base, tweaks), [base, tweaks])
  const contrast = useMemo(() => checkContrast(palette), [palette])
  const failing = contrast.filter((check) => !check.passes).length
  const [exportText, setExportText] = useState<string | null>(null)

  useEffect(() => headingRef.current?.focus(), [])

  // Escape closes the panel, like other overlays (it's non-modal, so the page stays usable).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // An open dropdown (the font select) handles its own Escape first.
      if (event.key === 'Escape' && !document.querySelector('[role="listbox"]')) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const primary = palette.primary
  const background = palette.background

  const copyCss = async () => {
    const css = buildTweaksCss(baseline, store, 'export')
    if (!css) {
      toast.info('Nothing to copy: every token matches globals.css.')
      return
    }
    try {
      await navigator.clipboard.writeText(css)
      setExportText(null)
      toast.success('CSS copied. Paste it into src/styles/globals.css to keep these choices.')
    } catch {
      // Clipboard needs a secure origin; show the text to copy by hand instead.
      setExportText(css)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="fixed inset-y-2 left-2 z-50 flex w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
    >
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="space-y-1">
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="type-subheading outline-none">
            Design tweaks
          </h2>
          <Badge variant="warning">Temporary · not in production</Badge>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close design tweaks" onClick={onClose}>
          <XIcon aria-hidden="true" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <Section title="Theme">
          <Tabs value={theme} onValueChange={(value) => setTheme(value as ThemeName)}>
            <TabsList className="w-full">
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="dark">Dark</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">Colour changes apply to the theme shown.</p>
        </Section>

        <Section
          title={`Colour · ${theme}`}
          action={
            <Button
              variant="ghost"
              size="xs"
              disabled={Object.keys(tweaks).length === 0}
              onClick={() => store.resetTheme(theme)}
            >
              <RotateCcwIcon aria-hidden="true" />
              Reset
            </Button>
          }
        >
          {primary && background ? (
            <>
              <div className="flex gap-1.5" aria-hidden="true">
                {(['primary', 'secondary', 'accent', 'background', 'card', 'muted'] as const).map((name) => (
                  <span
                    key={name}
                    title={name}
                    className="size-6 rounded-full ring-1 ring-foreground/15"
                    style={{ background: palette[name] ? formatOklch(palette[name]) : undefined }}
                  />
                ))}
              </div>
              {contrast.length ? (
                <p
                  role="status"
                  className={cn(
                    'flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm',
                    failing ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success-emphasis',
                  )}
                >
                  {failing ? (
                    <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  )}
                  {failing
                    ? `${failing} of ${contrast.length} text pairs fail WCAG AA. See Contrast below.`
                    : `All ${contrast.length} text pairs pass WCAG AA.`}
                </p>
              ) : null}
              <SliderField
                label="Brand hue"
                value={tweaks.brandHue ?? primary.h}
                min={0}
                max={360}
                step={1}
                format={(value) => `${value.toFixed(0)}°`}
                onChange={(brandHue) => store.setThemeTweak(theme, { brandHue })}
              />
              <SliderField
                label="Primary strength"
                value={tweaks.primaryChroma ?? primary.c}
                min={0}
                max={0.3}
                step={0.005}
                format={number(3)}
                onChange={(primaryChroma) => store.setThemeTweak(theme, { primaryChroma })}
              />
              <SliderField
                label="Primary lightness"
                value={tweaks.primaryLightness ?? primary.l}
                min={0.3}
                max={0.9}
                step={0.005}
                format={number(3)}
                onChange={(primaryLightness) => store.setThemeTweak(theme, { primaryLightness })}
              />
              <SliderField
                label="Background tint"
                value={tweaks.surfaceTint ?? base.background?.c ?? 0}
                min={0}
                max={0.04}
                step={0.001}
                format={number(3)}
                onChange={(surfaceTint) => store.setThemeTweak(theme, { surfaceTint })}
              />
              <SliderField
                label="Background lightness"
                value={tweaks.backgroundLightness ?? background.l}
                min={theme === 'light' ? 0.88 : 0.1}
                max={theme === 'light' ? 1 : 0.32}
                step={0.005}
                format={number(3)}
                onChange={(backgroundLightness) => store.setThemeTweak(theme, { backgroundLightness })}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">The colour tokens couldn’t be read from the page.</p>
          )}
        </Section>

        <Section title="Shape">
          {baseline.radiusRem !== null ? (
            <SliderField
              label="Corner radius"
              value={store.radiusRem ?? baseline.radiusRem}
              min={0}
              max={1.5}
              step={0.05}
              format={(value) => `${value.toFixed(2)}rem`}
              onChange={(radiusRem) => store.setRadius(radiusRem)}
            />
          ) : null}
        </Section>

        <Section title="Typography">
          <div className="space-y-1.5">
            <label htmlFor={`${headingId}-font`} className="text-sm font-medium">
              Display font (wordmark, hero titles)
            </label>
            <Select
              value={store.displayFont ?? 'playfair'}
              onValueChange={(value) => store.setDisplayFont(value as DisplayFont)}
            >
              <SelectTrigger id={`${headingId}-font`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(displayFonts).map(([id, font]) => (
                  <SelectItem key={id} value={id}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only fonts already in the project, so nothing new is downloaded.
            </p>
          </div>
        </Section>

        <Section title={`Contrast · ${theme}`}>
          <ul className="space-y-1.5">
            {contrast.map((check) => (
              <li key={check.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0">{check.label}</span>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 font-medium tabular-nums',
                    check.passes ? 'text-success-emphasis' : 'text-destructive',
                  )}
                >
                  {check.passes ? (
                    <CheckIcon aria-hidden="true" className="size-3.5" />
                  ) : (
                    <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
                  )}
                  {check.ratio.toFixed(1)}:1
                  <span className="sr-only">{check.passes ? ', passes AA' : ', fails AA'}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">WCAG AA needs 4.5:1 for normal text.</p>
        </Section>

        {exportText ? (
          <Section title="CSS to paste">
            <Textarea
              readOnly
              rows={8}
              value={exportText}
              aria-label="CSS to paste into globals.css"
              className="font-mono text-xs"
              onFocus={(event) => event.target.select()}
            />
            <p className="text-xs text-muted-foreground">
              Copying needs a secure origin here. Select the text and copy it by hand.
            </p>
          </Section>
        ) : null}
      </div>

      <div className="space-y-2 border-t px-4 py-3">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => void copyCss()}>
            <CopyIcon aria-hidden="true" />
            Copy CSS
          </Button>
          <Button variant="outline" onClick={store.resetAll}>
            Reset all
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Saved in this browser only. Paste the copied CSS into src/styles/globals.css to keep a choice.
        </p>
      </div>
    </div>
  )
}

/**
 * Floating panel for trying design token changes live: brand colour, surfaces, corner
 * radius and display font, with contrast checks and a CSS export. Development builds only.
 */
export default function DesignTweaks() {
  const [open, setOpen] = useState(false)
  // Read globals.css once. This module loads after the app has rendered, so the stylesheet is in place.
  const [baseline] = useState<Baseline>(readBaseline)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const state = useTweaksStore()

  useEffect(() => applyTweaksCss(buildTweaksCss(baseline, state, 'page')), [baseline, state])

  // Return focus to the tab when the panel closes.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (!open && wasOpen.current) triggerRef.current?.focus()
    wasOpen.current = open
  }, [open])

  return open ? (
    <TweaksPanel baseline={baseline} onClose={() => setOpen(false)} />
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(true)}
      className="fixed top-1/2 left-0 z-50 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-r-xl bg-foreground px-1.5 py-2 text-background opacity-70 shadow-lg transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 sm:py-3"
    >
      <PaletteIcon aria-hidden="true" className="size-4" />
      {/* Icon only on phones, so the tab covers as little of the page as possible. */}
      <span className="sr-only text-xs font-medium [writing-mode:vertical-rl] sm:not-sr-only">Design tweaks</span>
    </button>
  )
}
