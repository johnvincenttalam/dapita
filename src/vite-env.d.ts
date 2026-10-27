/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCKS?: string
  /** TEMPORARY: "true" includes the design tweaks panel in a build (see src/lib/env.ts). */
  readonly VITE_DESIGN_TWEAKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
