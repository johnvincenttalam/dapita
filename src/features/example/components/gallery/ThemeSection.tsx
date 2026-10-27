import { CircleCheckIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GallerySection } from '@/features/example/components/gallery/GallerySection'
import { cn } from '@/lib/utils'

const swatches = [
  { name: 'primary', className: 'bg-primary' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'info', className: 'bg-info' },
  { name: 'destructive', className: 'bg-destructive' },
]

function ThemePreview({ theme }: { theme: 'light' | 'dark' }) {
  const switchId = `preview-switch-${theme}`
  const inputId = `preview-input-${theme}`

  return (
    // The `light` / `dark` class scopes that theme's tokens to this panel only.
    <figure
      className={cn(theme, 'space-y-4 rounded-xl border bg-background p-4 text-foreground sm:p-5')}
      style={{ colorScheme: theme }}
    >
      <figcaption className="type-eyebrow text-muted-foreground">{theme} theme</figcaption>
      <ul className="grid grid-cols-4 gap-2" aria-label={`${theme} colour tokens`}>
        {swatches.map((swatch) => (
          <li key={swatch.name} className="space-y-1">
            <span className={cn('block h-8 rounded-md border', swatch.className)} />
            <span className="block truncate text-[11px] text-muted-foreground">{swatch.name}</span>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader>
          <CardTitle>Invite teammates</CardTitle>
          <CardDescription>Components resolve every colour from tokens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={inputId}>Email</Label>
            <Input id={inputId} placeholder="name@example.com" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={switchId}>Send welcome email</Label>
            <Switch id={switchId} defaultChecked />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Error</Badge>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm">Send invite</Button>
          <Button size="sm" variant="outline">
            Cancel
          </Button>
        </CardFooter>
      </Card>
      <Alert variant="success">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>Tokens are consistent</AlertTitle>
        <AlertDescription>Same component, both themes.</AlertDescription>
      </Alert>
    </figure>
  )
}

export function ThemeSection() {
  return (
    <GallerySection
      id="themes"
      title="Light and dark themes"
      description="Both previews render the same components; only the tokens change. Switch the page theme from the navbar."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ThemePreview theme="light" />
        <ThemePreview theme="dark" />
      </div>
    </GallerySection>
  )
}
