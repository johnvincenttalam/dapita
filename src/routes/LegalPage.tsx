import { FileTextIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { Container } from '@/components/shared/Container'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { legalDocuments } from '@/config/legal'
import { legalContent, type LegalBlock } from '@/features/legal/content'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { ConsentPurpose } from '@/types/account'

const linkClass = 'font-medium text-primary underline-offset-4 hover:underline'

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** Terms of use, privacy notice and merchant listing policy: one page per document in config/legal.ts. */
export default function LegalPage() {
  const { pathname } = useLocation()
  const [purpose, document] = (
    Object.entries(legalDocuments) as [ConsentPurpose, (typeof legalDocuments)[ConsentPurpose]][]
  ).find(([, candidate]) => candidate.href === pathname) ?? ['terms', legalDocuments.terms]
  const content = legalContent[purpose]
  const others = Object.values(legalDocuments).filter((candidate) => candidate.href !== document.href)
  useDocumentTitle(document.title)

  return (
    <Container className="space-y-4 py-page">
      <Breadcrumbs className="hidden md:block" minItems={2} />
      <ScreenHeader title={document.title} description={`Version ${document.version}`} backTo="/" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <article className="max-w-(--container-prose) min-w-0 space-y-8">
          <Alert variant="warning">
            <FileTextIcon aria-hidden="true" />
            <AlertTitle>Draft for review</AlertTitle>
            <AlertDescription>
              This text hasn’t been reviewed by a lawyer yet. Items in [brackets] are still to be filled in.
            </AlertDescription>
          </Alert>

          <p className="text-lg text-pretty">{content.summary}</p>

          {content.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id} className="scroll-mt-24 space-y-3">
              <h2 id={section.id} className="type-heading">
                {section.heading}
              </h2>
              <div className="space-y-3 text-pretty text-muted-foreground [&_li]:text-pretty">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </section>
          ))}

          <p className="border-t pt-6 text-sm text-muted-foreground">
            Questions about this document?{' '}
            <Link to="/support?topic=other" className={linkClass}>
              Contact support
            </Link>
            .
          </p>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <nav aria-label="On this page" className="hidden space-y-2 lg:block">
            <p className="type-label text-muted-foreground">On this page</p>
            <ul className="space-y-1.5 text-sm">
              {content.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-muted-foreground hover:text-foreground">
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Other policies" className="space-y-2">
            <p className="type-label text-muted-foreground">Other policies</p>
            <ul className="space-y-1.5 text-sm">
              {others.map((other) => (
                <li key={other.href}>
                  <Link to={other.href} className={linkClass}>
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </Container>
  )
}
