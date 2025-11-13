'use client'

import { useMemo } from 'react'
import { AlertCircle, Lightbulb, Loader2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useModels } from '@/lib/hooks/use-models'
import { Model } from '@/lib/types/models'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

function modelsByProvider(models: Model[], type: Model['type']) {
  return models
    .filter((model) => model.type === type)
    .reduce<Record<string, string[]>>((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = []
      }
      acc[model.provider].push(model.name)
      return acc
    }, {})
}

export function MeetingTemplatesTab() {
  // TODO: 实现会议模板相关的 hooks 和 API
  const meetingProfiles: any[] = []
  const participantProfiles: any[] = []
  const loadingMeetingProfiles = false
  const meetingProfilesError = null
  const loadingParticipantProfiles = false
  const participantProfilesError = null
  const usage = {}

  const {
    data: models = [],
    isLoading: loadingModels,
    error: modelsError,
  } = useModels()

  const languageModelOptions = useMemo(
    () => modelsByProvider(models, 'language'),
    [models]
  )
  const ttsModelOptions = useMemo(
    () => modelsByProvider(models, 'text_to_speech'),
    [models]
  )

  const isLoading = loadingMeetingProfiles || loadingParticipantProfiles || loadingModels
  const hasError = meetingProfilesError || participantProfilesError || modelsError

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">模板工作区</h2>
        <p className="text-sm text-muted-foreground">
          构建可重用的会议和参与者配置，以便快速生成会议内容。
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem 
          value="overview" 
          className="overflow-hidden rounded-xl border border-border bg-muted/40 px-4"
        >
          <AccordionTrigger className="gap-2 py-4 text-left text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              模板如何驱动会议内容生成
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <div className="space-y-4">
              <p className="text-muted-foreground/90">
                模板将会议工作流程分为两个可重用的构建块。在生成新会议内容时，可以混合搭配使用它们。
              </p>

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">会议配置文件设置格式</h4>
                <ul className="list-disc space-y-1 pl-5">
                  <li>概述会议段落的数量和流程</li>
                  <li>选择用于简报、大纲和脚本编写的语言模型</li>
                  <li>存储默认简报，使每个会议都以一致的语调开始</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">参与者配置文件赋予声音</h4>
                <ul className="list-disc space-y-1 pl-5">
                  <li>选择文本转语音提供商和模型</li>
                  <li>捕获每个参与者的个性、背景和发音说明</li>
                  <li>在不同会议格式中重复使用相同的主持人或参与者声音</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">推荐工作流程</h4>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>为每个需要的声音创建参与者配置文件</li>
                  <li>构建引用这些参与者名称的会议配置文件</li>
                  <li>通过选择适合的会议配置文件来生成会议内容</li>
                </ol>
                <p className="text-xs text-muted-foreground/80">
                  会议配置文件通过名称引用参与者配置文件，因此从参与者开始可以避免以后缺少声音分配。
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {hasError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载模板数据失败</AlertTitle>
          <AlertDescription>
            确保 API 正在运行并重试。某些部分可能不完整。
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载模板中…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* TODO: 实现 ParticipantProfilesPanel 和 MeetingProfilesPanel 组件 */}
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">参与者配置文件</h3>
            <p className="text-sm text-muted-foreground">
              参与者配置文件功能即将推出。
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">会议配置文件</h3>
            <p className="text-sm text-muted-foreground">
              会议配置文件功能即将推出。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

