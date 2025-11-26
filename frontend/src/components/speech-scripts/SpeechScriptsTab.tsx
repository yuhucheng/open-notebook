'use client'

import { useCallback, useState } from 'react'
import { AlertCircle, Loader2, RefreshCcw } from 'lucide-react'

import { useDeleteSpeechScript, useDuplicateSpeechScript, useSpeechScripts } from '@/lib/hooks/use-speech-scripts'
import { SpeechScriptCard } from '@/components/speech-scripts/SpeechScriptCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GenerateSpeechScriptDialog } from '@/components/speech-scripts/GenerateSpeechScriptDialog'

const STATUS_ORDER: Array<{
  key: 'processing' | 'completed' | 'failed' | 'draft'
  title: string
  description?: string
}> = [
  {
    key: 'processing',
    title: '正在处理',
    description: '演讲稿正在生成中。',
  },
  {
    key: 'draft',
    title: '草稿',
    description: '演讲稿草稿，等待处理。',
  },
  {
    key: 'completed',
    title: '已完成',
    description: '演讲稿生成完成，可以查看和编辑。',
  },
  {
    key: 'failed',
    title: '失败',
    description: '演讲稿生成过程中出现错误。',
  },
]

function SummaryBadge({
  label,
  value,
  active,
  onClick
}: {
  label: string
  value: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className={`font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${
        active ? 'bg-primary text-primary-foreground' : ''
      }`}
      onClick={onClick}
    >
      <span className={active ? 'mr-1.5' : 'text-muted-foreground mr-1.5'}>{label}</span>
      <span className={active ? 'text-primary-foreground' : 'text-foreground'}>{value}</span>
    </Badge>
  )
}

type FilterType = 'all' | 'processing' | 'completed' | 'failed' | 'draft'

export function SpeechScriptsTab() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const {
    speechScripts,
    statusGroups,
    statusCounts,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useSpeechScripts()
  const deleteSpeechScript = useDeleteSpeechScript()
  const duplicateSpeechScript = useDuplicateSpeechScript()

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleDelete = useCallback(
    (speechScriptId: string) => deleteSpeechScript.mutateAsync(speechScriptId),
    [deleteSpeechScript]
  )

  const handleDuplicate = useCallback(
    (speechScriptId: string) => duplicateSpeechScript.mutateAsync({ speechScriptId }),
    [duplicateSpeechScript]
  )

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter)
  }, [])

  // 根据当前过滤器获取要显示的演讲稿
  const getFilteredScripts = useCallback(() => {
    if (activeFilter === 'all') {
      return speechScripts
    }
    return statusGroups[activeFilter] || []
  }, [activeFilter, speechScripts, statusGroups])

  const filteredScripts = getFilteredScripts()
  const emptyState = !isLoading && speechScripts.length === 0
  const filteredEmptyState = !isLoading && filteredScripts.length === 0 && activeFilter !== 'all'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">演讲稿概览</h2>
          <p className="text-sm text-muted-foreground">
            监控演讲稿生成任务并查看最终成果。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowGenerateDialog(true)}>
            生成演讲稿
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            刷新
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SummaryBadge
          label="总计"
          value={statusCounts.total}
          active={activeFilter === 'all'}
          onClick={() => handleFilterChange('all')}
        />
        <SummaryBadge
          label="处理中"
          value={statusCounts.processing}
          active={activeFilter === 'processing'}
          onClick={() => handleFilterChange('processing')}
        />
        <SummaryBadge
          label="已完成"
          value={statusCounts.completed}
          active={activeFilter === 'completed'}
          onClick={() => handleFilterChange('completed')}
        />
        <SummaryBadge
          label="失败"
          value={statusCounts.failed}
          active={activeFilter === 'failed'}
          onClick={() => handleFilterChange('failed')}
        />
        <SummaryBadge
          label="草稿"
          value={statusCounts.draft}
          active={activeFilter === 'draft'}
          onClick={() => handleFilterChange('draft')}
        />
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载演讲稿失败</AlertTitle>
          <AlertDescription>
            无法获取最新的演讲稿数据。请稍后重试。
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载演讲稿…
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            还没有演讲稿。从notebook或source聊天界面生成第一个演讲稿。
          </p>
        </div>
      ) : filteredEmptyState ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            没有{activeFilter === 'processing' ? '正在处理的' :
                  activeFilter === 'completed' ? '已完成的' :
                  activeFilter === 'failed' ? '失败的' :
                  activeFilter === 'draft' ? '草稿状态的' : ''}演讲稿。
          </p>
        </div>
      ) : activeFilter === 'all' ? (
        // 显示所有状态的分组
        STATUS_ORDER.map(({ key, title, description }) => {
          const data = statusGroups[key]
          if (!data || data.length === 0) {
            return null
          }

          return (
            <section key={key} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <Separator />
              <div className="space-y-4">
                {data.map((speechScript) => (
                  <SpeechScriptCard
                    key={speechScript.id}
                    speechScript={speechScript}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    deleting={deleteSpeechScript.isPending}
                    duplicating={duplicateSpeechScript.isPending}
                  />
                ))}
              </div>
            </section>
          )
        })
      ) : (
        // 显示过滤后的单一状态列表
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight">
              {activeFilter === 'processing' ? '正在处理' :
               activeFilter === 'completed' ? '已完成' :
               activeFilter === 'failed' ? '失败' :
               activeFilter === 'draft' ? '草稿' : '演讲稿'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeFilter === 'processing' ? '演讲稿正在生成中。' :
               activeFilter === 'completed' ? '演讲稿生成完成，可以查看和编辑。' :
               activeFilter === 'failed' ? '演讲稿生成过程中出现错误。' :
               activeFilter === 'draft' ? '演讲稿草稿，等待处理。' : ''}
            </p>
          </div>
          <Separator />
          <div className="space-y-4">
            {filteredScripts.map((speechScript) => (
              <SpeechScriptCard
                key={speechScript.id}
                speechScript={speechScript}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                deleting={deleteSpeechScript.isPending}
                duplicating={duplicateSpeechScript.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <GenerateSpeechScriptDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
      />
    </div>
  )
}
