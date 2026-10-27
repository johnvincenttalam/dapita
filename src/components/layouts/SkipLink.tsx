/** Lets keyboard users jump past the navigation. Each layout's <main> has id="main-content". */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      Skip to content
    </a>
  )
}
