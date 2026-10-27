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
*/

import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC_ROOT = fileURLToPath(new URL('../../src/', import.meta.url))

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const base = SRC_ROOT + specifier.slice(2)
      const file = [`${base}.ts`, `${base}/index.ts`, base].find((candidate) =>
        existsSync(candidate)
      )
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    return nextResolve(specifier, context)
  },
})
