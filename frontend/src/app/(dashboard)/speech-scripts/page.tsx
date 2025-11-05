'use client'

import { useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpeechScriptsTab } from '@/components/speech-scripts/SpeechScriptsTab'
import { FileText, Settings } from 'lucide-react'

export default function SpeechScriptsPage() {
  const [activeTab, setActiveTab] = useState<'scripts' | 'settings'>('scripts')

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">演讲稿</h1>
            <p className="text-muted-foreground">
              基于PPT文件生成结构化的演讲稿，包含大纲和讲稿内容。
            </p>
          </header>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'scripts' | 'settings')}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">选择视图</p>
              <TabsList aria-label="演讲稿视图" className="w-full max-w-md">
                <TabsTrigger value="scripts">
                  <FileText className="h-4 w-4" />
                  演讲稿
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4" />
                  设置
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="scripts">
              <SpeechScriptsTab />
            </TabsContent>

            <TabsContent value="settings">
              <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  演讲稿设置功能即将上线。
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
