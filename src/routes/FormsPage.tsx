import { InfoIcon } from 'lucide-react'

import { Container } from '@/components/shared/Container'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ProfileEditForm } from '@/features/example/components/ProfileEditForm'
import { RegistrationForm } from '@/features/example/components/RegistrationForm'
import { SearchFilterDemo } from '@/features/example/components/SearchFilterDemo'
import { useDocumentTitle } from '@/hooks/use-document-title'

export default function FormsPage() {
  useDocumentTitle('Forms playground')

  return (
    <Container className="space-y-12 py-10 lg:py-14">
      <PageHeader
        eyebrow="Playground"
        title="Forms"
        description="React Hook Form + Zod: required fields, invalid input, cross-field rules, server errors, loading and success states."
      />

      <Alert variant="info">
        <InfoIcon aria-hidden="true" />
        <AlertTitle>Nothing is submitted anywhere</AlertTitle>
        <AlertDescription>
          These forms use mock handlers with a simulated delay. No account is created and no data is persisted.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="account-forms" className="space-y-6">
        <SectionHeader
          id="account-forms"
          title="Account forms"
          description="Validation runs when a field loses focus, then on every change."
        />
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <RegistrationForm />
          <ProfileEditForm />
        </div>
      </section>

      <section aria-labelledby="search-forms" className="space-y-6">
        <SectionHeader
          id="search-forms"
          title="Search and filter controls"
          description="Composed from SearchInput, FilterBar, Checkbox, RadioGroup, DatePicker and Select."
        />
        <SearchFilterDemo />
      </section>
    </Container>
  )
}
