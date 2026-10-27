import { SidebarNote } from '@/components/layouts/AppSidebar'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { devNav } from '@/config/navigation'

/** Template reference pages (component gallery, form and dashboard demos). Development builds only. */
export function DevLayout() {
  return (
    <DashboardLayout
      nav={devNav}
      label="Developer reference"
      homeTo="/dev"
      brandSubtitle="Developer reference"
      footer={<SidebarNote>Development build only</SidebarNote>}
    />
  )
}
