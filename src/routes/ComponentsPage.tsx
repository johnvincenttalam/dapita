import { Container } from '@/components/shared/Container'
import { PageHeader } from '@/components/shared/PageHeader'
import { ButtonsSection } from '@/features/example/components/gallery/ButtonsSection'
import { DisplaySection } from '@/features/example/components/gallery/DisplaySection'
import { FormControlsSection } from '@/features/example/components/gallery/FormControlsSection'
import { NavigationSection } from '@/features/example/components/gallery/NavigationSection'
import { OverlaysSection } from '@/features/example/components/gallery/OverlaysSection'
import { StatesSection } from '@/features/example/components/gallery/StatesSection'
import { ThemeSection } from '@/features/example/components/gallery/ThemeSection'
import { useDocumentTitle } from '@/hooks/use-document-title'

const sections = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'form-controls', label: 'Form controls' },
  { id: 'display', label: 'Data display' },
  { id: 'overlays', label: 'Overlays and feedback' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'states', label: 'States' },
  { id: 'themes', label: 'Themes' },
]

export default function ComponentsPage() {
  useDocumentTitle('Components')

  return (
    <Container className="py-10 lg:py-14">
      <PageHeader
        eyebrow="Design system"
        title="Component gallery"
        description="Every shared component with its variants, sizes and states. All controls are interactive."
      />

      <div className="mt-10 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Gallery sections" className="mb-8 lg:mb-0">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1 lg:overflow-visible">
            {sections.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-lg:border"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-16">
          <ButtonsSection />
          <FormControlsSection />
          <DisplaySection />
          <OverlaysSection />
          <NavigationSection />
          <StatesSection />
          <ThemeSection />
        </div>
      </div>
    </Container>
  )
}
