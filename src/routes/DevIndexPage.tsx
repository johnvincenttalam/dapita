import type { LucideIcon } from 'lucide-react'
import {
  ArrowRightIcon,
  BlocksIcon,
  DatabaseZapIcon,
  FormInputIcon,
  LayoutTemplateIcon,
  MoonStarIcon,
  PaletteIcon,
  ShieldCheckIcon,
  TestTubeDiagonalIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { Container } from '@/components/shared/Container'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/use-document-title'

interface Capability {
  icon: LucideIcon
  title: string
  description: string
}

const capabilities: Capability[] = [
  {
    icon: PaletteIcon,
    title: 'Design tokens',
    description: 'Semantic colours, type scale, radii, spacing and shadows defined once in CSS variables.',
  },
  {
    icon: MoonStarIcon,
    title: 'Light, dark and system themes',
    description: 'Applied before first paint, persisted per browser and shared by every component.',
  },
  {
    icon: BlocksIcon,
    title: 'Component library',
    description: 'shadcn/ui primitives on Radix plus app-level wrappers: data table, filters, date picker, states.',
  },
  {
    icon: LayoutTemplateIcon,
    title: 'Reusable layouts',
    description: 'Public, auth and dashboard shells composed through nested routes. No duplicated navigation.',
  },
  {
    icon: FormInputIcon,
    title: 'Typed forms',
    description: 'React Hook Form with Zod schemas, accessible error wiring and loading/success feedback.',
  },
  {
    icon: DatabaseZapIcon,
    title: 'Data layer',
    description: 'TanStack Query, a typed fetch client and swappable mock services. No backend required.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Accessible by default',
    description: 'Landmarks, skip link, focus rings, keyboard menus, reduced motion and labelled controls.',
  },
  {
    icon: TestTubeDiagonalIcon,
    title: 'Tested',
    description: 'Vitest + Testing Library for components and Playwright for end-to-end flows.',
  },
]

const stack = [
  'React 19',
  'Vite',
  'TypeScript (strict)',
  'Tailwind CSS v4',
  'shadcn/ui',
  'React Router',
  'TanStack Query',
  'Zod',
]

export default function DevIndexPage() {
  useDocumentTitle()

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
        />
        <Container className="flex flex-col items-center py-section text-center">
          <Badge variant="secondary" className="mb-6">
            Starter template · v0.1
          </Badge>
          <h1 className="max-w-4xl type-display">
            A cohesive foundation for your next <span className="text-primary">React</span> product
          </h1>
          <p className="mt-6 max-w-2xl type-lead text-pretty text-muted-foreground">
            Design system, layouts, forms, data fetching and tests, wired together and ready to extend into a SaaS
            dashboard, booking marketplace, admin panel or customer-facing site.
          </p>
          <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link to="/dev/components">
                Browse components
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dev/dashboard">Open the dashboard</Link>
            </Button>
          </div>
          <ul aria-label="Technology stack" className="mt-12 flex max-w-2xl flex-wrap justify-center gap-2">
            {stack.map((item) => (
              <li key={item}>
                <Badge variant="outline">{item}</Badge>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container as="section" aria-labelledby="capabilities-heading" className="py-section">
        <SectionHeader
          id="capabilities-heading"
          title="What’s included"
          description="Everything a new project needs on day one, and nothing it has to remove."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <Card className="h-full">
                <CardHeader>
                  <span className="mb-2 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4.5" />
                  </span>
                  <CardTitle>
                    <h3>{title}</h3>
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </Container>

      <section aria-labelledby="explore-heading" className="border-y bg-muted/40">
        <Container className="py-section">
          <SectionHeader
            id="explore-heading"
            title="Explore the demos"
            description="Every page is functional. Data is mock and stays in your browser."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                to: '/components',
                title: 'Component gallery',
                body: 'Variants, sizes and states for every shared component.',
              },
              {
                to: '/forms',
                title: 'Forms playground',
                body: 'Validation, server errors, loading and success states.',
              },
              {
                to: '/dashboard',
                title: 'Dashboard',
                body: 'Metrics, activity and a searchable, sortable data table.',
              },
            ].map((item) => (
              <Card key={item.to} className="group relative transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>
                    <h3>
                      <Link to={item.to} className="after:absolute after:inset-0 focus-visible:underline">
                        {item.title}
                      </Link>
                    </h3>
                  </CardTitle>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
