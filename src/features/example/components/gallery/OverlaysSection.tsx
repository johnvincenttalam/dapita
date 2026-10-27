import {
  CopyIcon,
  HelpCircleIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Demo, GallerySection } from '@/features/example/components/gallery/GallerySection'
import { delay } from '@/services/mock/utils'
import { useUiStore } from '@/stores/ui-store'

function RenameDialog() {
  const id = useId()
  const [name, setName] = useState('Q4 roadmap')
  const [draft, setDraft] = useState(name)
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(name)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilIcon aria-hidden="true" />
          Rename “{name}”
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!draft.trim()) return
            setName(draft.trim())
            setOpen(false)
            toast.success('Renamed (local state only)')
          }}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>Focus moves into the dialog and returns to the trigger on close.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={id}>Name</Label>
            <Input id={id} value={draft} onChange={(event) => setDraft(event.target.value)} required />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!draft.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FiltersSheet() {
  const [archived, setArchived] = useState(false)
  const id = useId()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontalIcon aria-hidden="true" />
          Open sheet
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>View options</SheetTitle>
          <SheetDescription>Sheets slide in from an edge; used for the mobile navigation and sidebar.</SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between gap-4 px-4">
          <Label htmlFor={id}>Show archived items</Label>
          <Switch id={id} checked={archived} onCheckedChange={setArchived} />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function OverlaysSection() {
  const setCommandMenuOpen = useUiStore((state) => state.setCommandMenuOpen)
  const [showStatusBar, setShowStatusBar] = useState(true)

  return (
    <GallerySection
      id="overlays"
      title="Overlays and feedback"
      description="Dialogs trap focus, menus support arrow keys and typeahead, and Escape closes everything."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Dialogs">
          <RenameDialog />
          <ConfirmDialog
            trigger={
              <Button variant="destructive">
                <Trash2Icon aria-hidden="true" />
                Delete project
              </Button>
            }
            destructive
            title="Delete this project?"
            description="This is a demo: the confirm button waits for a simulated request, then closes. Nothing is deleted."
            confirmLabel="Delete project"
            onConfirm={async () => {
              await delay(1000)
              toast.success('Project deleted (mock)')
            }}
          />
        </Demo>

        <Demo title="Sheet, popover and tooltip">
          <FiltersSheet />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2">
                <h4 className="type-label">Popover</h4>
                <p className="text-sm text-muted-foreground">
                  Non-modal content anchored to a trigger. Used by the date picker and notifications.
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Help">
                <HelpCircleIcon aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tooltips supplement, never replace, a visible or accessible label</TooltipContent>
          </Tooltip>
        </Demo>

        <Demo title="Dropdown menu and command menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontalIcon aria-hidden="true" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => toast('Profile selected')}>
                  <UserIcon aria-hidden="true" />
                  Profile
                  <DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast('Link copied (demo)')}>
                  <CopyIcon aria-hidden="true" />
                  Copy link
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showStatusBar} onCheckedChange={setShowStatusBar}>
                Show status bar
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => toast('Signed out (demo)')}>
                <LogOutIcon aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="secondary" onClick={() => setCommandMenuOpen(true)}>
            Open command menu
          </Button>
        </Demo>

        <Demo title="Toast notifications" description="Sonner toasts announce politely and can be dismissed.">
          <Button variant="outline" onClick={() => toast.success('Changes saved')}>
            Success
          </Button>
          <Button variant="outline" onClick={() => toast.info('A new version is available')}>
            Info
          </Button>
          <Button variant="outline" onClick={() => toast.warning('Storage almost full')}>
            Warning
          </Button>
          <Button variant="outline" onClick={() => toast.error('Could not reach the server')}>
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(delay(1500), {
                loading: 'Uploading (mock)…',
                success: 'Upload complete',
                error: 'Upload failed',
              })
            }
          >
            Promise
          </Button>
        </Demo>
      </div>
    </GallerySection>
  )
}
