import { useSearchParams } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearanceSettingsCard } from '@/features/settings/components/AppearanceSettingsCard'
import { NotificationSettingsCard } from '@/features/settings/components/NotificationSettingsCard'
import { ProfileSettingsCard } from '@/features/settings/components/ProfileSettingsCard'
import { useDocumentTitle } from '@/hooks/use-document-title'

const tabs = ['profile', 'appearance', 'notifications'] as const
type SettingsTab = (typeof tabs)[number]

function isSettingsTab(value: string | null): value is SettingsTab {
  return tabs.some((tab) => tab === value)
}

export default function SettingsPage() {
  useDocumentTitle('Settings')
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  // The active tab lives in the URL so it survives reloads and can be linked to.
  const activeTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : 'profile'

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your profile, appearance and notification preferences." />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setSearchParams(value === 'profile' ? {} : { tab: value }, { replace: true })}
        className="gap-6"
      >
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <div className="max-w-3xl">
          <TabsContent value="profile">
            <ProfileSettingsCard />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceSettingsCard />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationSettingsCard />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
