import { ArrowRightIcon, DownloadIcon, PlusIcon, SettingsIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import { Demo, GallerySection } from '@/features/example/components/gallery/GallerySection'
import { Button, type ButtonProps } from '@/components/ui/button'
import { delay } from '@/services/mock/utils'

const variants: NonNullable<ButtonProps['variant']>[] = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
]
const sizes: NonNullable<ButtonProps['size']>[] = ['sm', 'default', 'lg']

export function ButtonsSection() {
  const [saving, setSaving] = useState(false)

  const simulateSave = async () => {
    setSaving(true)
    await delay(1500)
    setSaving(false)
  }

  return (
    <GallerySection
      id="buttons"
      title="Buttons"
      description="Six variants and three sizes, plus icon, loading, disabled and full-width states."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Variants">
          {variants.map((variant) => (
            <Button key={variant} variant={variant} className="capitalize">
              {variant}
            </Button>
          ))}
        </Demo>
        <Demo title="Sizes">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              Size {size}
            </Button>
          ))}
        </Demo>
        <Demo title="With icons" description="Icons inherit the button's size; icon-only buttons need an aria-label.">
          <Button>
            <PlusIcon aria-hidden="true" />
            New project
          </Button>
          <Button variant="outline">
            Continue
            <ArrowRightIcon aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Settings">
            <SettingsIcon aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Download">
            <DownloadIcon aria-hidden="true" />
          </Button>
          <Button variant="destructive" size="icon-lg" aria-label="Delete">
            <Trash2Icon aria-hidden="true" />
          </Button>
        </Demo>
        <Demo title="States">
          <Button loading={saving} onClick={() => void simulateSave()}>
            {saving ? 'Saving…' : 'Click to load'}
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled outline
          </Button>
          <Button variant="outline" loading>
            Loading
          </Button>
        </Demo>
        <Demo title="Full width" className="lg:col-span-2" contentClassName="block space-y-2">
          <Button fullWidth>Full-width primary</Button>
          <Button fullWidth variant="outline">
            Full-width outline
          </Button>
        </Demo>
      </div>
    </GallerySection>
  )
}
