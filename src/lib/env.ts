/**
 * Typed access to public (VITE_*) environment variables.
 *
 * Everything here ends up in the browser bundle. Never put secrets,
 * private API keys or service credentials in VITE_* variables.
 */
export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Dapita',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  /** When true (the default), services return in-browser mock data instead of calling the API. */
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') !== 'false',
} as const
