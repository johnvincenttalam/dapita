/*
|--------------------------------------------------------------------------
| Shared frontend modules
|--------------------------------------------------------------------------
|
| The booking rules (state machine, opening hours, response deadlines) live
| in the frontend's `src/` folder and use the `@/` alias. This hook resolves
| `@/…` to that folder so the server runs the exact same rules instead of a
| copy that could drift. Only pure modules (no DOM, no `import.meta.env`) may
| be imported this way; see `app/shared/`.
|
| A package a shared module imports (such as `zod` for the form schemas) is
| looked up from `src/` first, then from the server's own dependencies, so the
| server runs without the frontend's node_modules installed.
|
*/

import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC_ROOT = fileURLToPath(new URL('../../src/', import.meta.url))
const SRC_URL = pathToFileURL(SRC_ROOT).href

const isPackage = (specifier: string) => !/^(\.|\/|#|@\/|[a-z]+:)/i.test(specifier)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const base = SRC_ROOT + specifier.slice(2)
      const file = [`${base}.ts`, `${base}/index.ts`, base].find((candidate) =>
        existsSync(candidate)
      )
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    if (isPackage(specifier) && context.parentURL?.startsWith(SRC_URL)) {
      try {
        return nextResolve(specifier, context)
      } catch {
        return nextResolve(specifier, { ...context, parentURL: import.meta.url })
      }
    }
    return nextResolve(specifier, context)
  },
})
