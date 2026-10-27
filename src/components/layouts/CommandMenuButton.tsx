import { SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

/** Opens the command menu. Shows a search-style field on wide screens and an icon button on small ones. */
export function CommandMenuButton({ className }: { className?: string }) {
  const setOpen = useUiStore((state) => state.setCommandMenuOpen)

  return (
    <>
      <Button
        variant="outline"
        className={cn('hidden w-56 justify-start font-normal text-muted-foreground lg:inline-flex', className)}
        onClick={() => setOpen(true)}
      >
        <SearchIcon aria-hidden="true" />
        <span className="flex-1 text-left">Search…</span>
        <KbdGroup aria-hidden="true">
          <Kbd>{isApple ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <span className="sr-only">Open command menu</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open command menu"
        onClick={() => setOpen(true)}
      >
        <SearchIcon aria-hidden="true" />
      </Button>
    </>
  )
}
