import { InfoIcon } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CustomersTable } from '@/features/dashboard/components/CustomersTable'
import { DemoStateSwitcher } from '@/features/dashboard/components/DemoStateSwitcher'
import { MetricsGrid } from '@/features/dashboard/components/MetricsGrid'
import { RecentActivity } from '@/features/dashboard/components/RecentActivity'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { env } from '@/lib/env'

export default function DashboardPage() {
  useDocumentTitle('Dashboard')

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="An overview of your workspace. Replace these widgets with your own features."
        actions={<DemoStateSwitcher />}
      />

      {env.useMocks ? (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Every number on this page is mock data generated in your browser. Use “Demo state” to preview loading, empty
            and error states.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="overview-heading" className="space-y-4">
        <h2 id="overview-heading" className="sr-only">
          Overview
        </h2>
        <MetricsGrid />
      </section>

      <div className="grid gap-6">
        <CustomersTable />
        <RecentActivity />
      </div>
    </div>
  )
}
