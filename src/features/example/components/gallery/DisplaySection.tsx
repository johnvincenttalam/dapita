import { CircleCheckIcon, InfoIcon, OctagonAlertIcon, TriangleAlertIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Demo, GallerySection } from '@/features/example/components/gallery/GallerySection'

const invoices = [
  { id: 'INV-001', status: 'Paid', method: 'Card', amount: '$250.00' },
  { id: 'INV-002', status: 'Pending', method: 'Transfer', amount: '$150.00' },
  { id: 'INV-003', status: 'Overdue', method: 'Card', amount: '$350.00' },
]

export function DisplaySection() {
  return (
    <GallerySection id="display" title="Data display" description="Badges, cards, alerts, avatars and tables.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Badges" description="Status badges pair colour with text so meaning never relies on colour alone.">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">
            <CircleCheckIcon aria-hidden="true" />
            Success
          </Badge>
          <Badge variant="warning">
            <TriangleAlertIcon aria-hidden="true" />
            Warning
          </Badge>
          <Badge variant="info">
            <InfoIcon aria-hidden="true" />
            Info
          </Badge>
          <Badge variant="destructive">
            <OctagonAlertIcon aria-hidden="true" />
            Destructive
          </Badge>
        </Demo>

        <Demo title="Avatars, separators and keyboard keys">
          <div className="flex -space-x-2">
            <Avatar className="ring-2 ring-background">
              <AvatarImage src="/favicon.svg" alt="Starter logo" />
              <AvatarFallback>ST</AvatarFallback>
            </Avatar>
            <Avatar className="ring-2 ring-background">
              <AvatarFallback>JR</AvatarFallback>
            </Avatar>
            <Avatar className="ring-2 ring-background">
              <AvatarFallback>+3</AvatarFallback>
            </Avatar>
          </div>
          <Separator orientation="vertical" className="data-vertical:h-8 data-vertical:self-center" />
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
          <Separator orientation="vertical" className="data-vertical:h-8 data-vertical:self-center" />
          <div className="flex items-center gap-3" aria-label="Loading placeholder">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </Demo>

        <Demo title="Card composition" contentClassName="block">
          <Card>
            <CardHeader>
              <CardTitle>Team plan</CardTitle>
              <CardDescription>Header, title, description, action, content and footer slots.</CardDescription>
              <CardAction>
                <Badge variant="success">Active</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm">12 of 20 seats in use. Renews on November 1 (mock).</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">Manage seats</Button>
              <Button size="sm" variant="ghost">
                View usage
              </Button>
            </CardFooter>
          </Card>
        </Demo>

        <Demo
          title="Table"
          description="Static table. See the dashboard for the sortable DataTable."
          contentClassName="block"
        >
          <Table>
            <TableCaption className="sr-only">Recent mock invoices</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.status}</TableCell>
                  <TableCell>{invoice.method}</TableCell>
                  <TableCell className="text-right tabular-nums">{invoice.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Demo>

        <Demo title="Alerts" className="lg:col-span-2" contentClassName="grid gap-3 md:grid-cols-2">
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertTitle>Default</AlertTitle>
            <AlertDescription>Neutral information that doesn’t need attention.</AlertDescription>
          </Alert>
          <Alert variant="info">
            <InfoIcon aria-hidden="true" />
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>A new version of the template is available.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <CircleCheckIcon aria-hidden="true" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Your changes were saved.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>You are using 90% of your storage quota.</AlertDescription>
          </Alert>
          <Alert variant="destructive" className="md:col-span-2">
            <OctagonAlertIcon aria-hidden="true" />
            <AlertTitle>Destructive</AlertTitle>
            <AlertDescription>
              The payment method on file was declined (example copy, no payments exist).
            </AlertDescription>
          </Alert>
        </Demo>
      </div>
    </GallerySection>
  )
}
