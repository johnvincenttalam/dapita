import { SidebarNote } from '@/components/layouts/AppSidebar'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { adminNav } from '@/config/navigation'
import { useSession } from '@/features/auth/api/queries'
import { roleLabels } from '@/lib/roles'
import { env } from '@/lib/env'

/** Admin console (doc §6.5). No design exists, so it reuses the merchant dashboard shell. */
export function AdminLayout() {
  const { user } = useSession()
  const role = user?.roles.includes('admin') ? 'admin' : 'support'

  return (
    <DashboardLayout
      nav={adminNav}
      label="Admin console"
      homeTo="/admin"
      brandSubtitle="Admin console"
      notifications="admin"
      accountSubtitle={roleLabels[role]}
      footer={<SidebarNote>{env.useMocks ? 'Prototype · mock data' : 'Pilot server · demo data'}</SidebarNote>}
    />
  )
}
