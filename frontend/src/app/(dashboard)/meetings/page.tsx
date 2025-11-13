'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MeetingsTab } from '@/components/meetings/MeetingsTab'
import { MeetingTemplatesTab } from '@/components/meetings/MeetingTemplatesTab'
import { Video, LayoutTemplate } from 'lucide-react'

export default function MeetingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'meetings' | 'templates'>('meetings')

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t('meetings.title')}</h1>
            <p className="text-muted-foreground">
              {t('meetings.subtitle')}
            </p>
          </header>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'meetings' | 'templates')}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common.chooseView')}</p>
              <TabsList aria-label="Meeting views" className="w-full max-w-md">
                <TabsTrigger value="meetings">
                  <Video className="h-4 w-4" />
                  {t('meetings.meetings')}
                </TabsTrigger>
                {/* <TabsTrigger value="templates">
                  <LayoutTemplate className="h-4 w-4" />
                  模板
                </TabsTrigger> */}
              </TabsList>
            </div>

            <TabsContent value="meetings">
              <MeetingsTab />
            </TabsContent>

            <TabsContent value="templates">
              <MeetingTemplatesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
