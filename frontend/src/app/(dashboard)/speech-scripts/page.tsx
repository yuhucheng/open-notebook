'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpeechScriptsTab } from '@/components/speech-scripts/SpeechScriptsTab'
import { FileText, Settings } from 'lucide-react'

export default function SpeechScriptsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'scripts' | 'settings'>('scripts')

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t('speechScripts.title')}</h1>
            <p className="text-muted-foreground">
              {t('speechScripts.subtitle')}
            </p>
          </header>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'scripts' | 'settings')}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common.chooseView')}</p>
              <TabsList aria-label="Speech script views" className="w-full max-w-md">
                <TabsTrigger value="scripts">
                  <FileText className="h-4 w-4" />
                  {t('speechScripts.scripts')}
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4" />
                  {t('speechScripts.settings')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="scripts">
              <SpeechScriptsTab />
            </TabsContent>

            <TabsContent value="settings">
              <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('speechScripts.settingsComingSoon')}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}

