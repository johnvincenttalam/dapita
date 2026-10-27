import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { Container } from '@/components/shared/Container'
import { PlannedScreen } from '@/components/shared/PlannedScreen'

/** TEMPORARY placeholder for full-width marketplace routes; adds the page container and breadcrumbs. */
export default function PlannedPublicPage() {
  return (
    <Container className="space-y-4 py-page">
      <Breadcrumbs className="hidden md:block" minItems={2} />
      <PlannedScreen />
    </Container>
  )
}
