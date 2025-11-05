'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCcw,
} from 'lucide-react'

import { useSpeechScript, useUpdateOutlineSectionOrder } from '@/lib/hooks/use-speech-scripts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OutlineSectionCard } from '@/components/speech-scripts/OutlineSectionCard'
import { OutlineSectionReorderDialog } from '@/components/speech-scripts/OutlineSectionReorderDialog'

interface SpeechScriptDetailProps {
  speechScriptId: string
}

const statusConfig = {
  draft: {
    icon: FileText,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: '草稿',
  },
  processing: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: '处理中',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: '已完成',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: '失败',
  },
} as const

export function SpeechScriptDetail({ speechScriptId }: SpeechScriptDetailProps) {
  const router = useRouter()
  const [showReorderDialog, setShowReorderDialog] = useState(false)

  const {
    data: speechScriptData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useSpeechScript(speechScriptId)

  const updateOrder = useUpdateOutlineSectionOrder()

  const handleRefresh = () => {
    void refetch()
  }

  const handleReorder = (newOrder: Array<{ id: string; order_index: number }>) => {
    // 批量更新排序
    newOrder.forEach(({ id, order_index }) => {
      updateOrder.mutate({
        speechScriptId,
        sectionId: id,
        orderIndex: order_index,
      })
    })
    setShowReorderDialog(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载演讲稿中...</span>
      </div>
    )
  }

  if (isError || !speechScriptData) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            无法加载演讲稿详情。请稍后重试。
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { speech_script: speechScript, outline_sections: outlineSections } = speechScriptData
  const status = statusConfig[speechScript.status as keyof typeof statusConfig] || statusConfig.draft
  const StatusIcon = status.icon

  const createdAt = speechScript.created ? new Date(speechScript.created) : null
  const timeAgo = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true, locale: zhCN }) : null

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回演讲稿列表
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

      {/* 演讲稿信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`rounded-lg p-2 ${status.bgColor}`}>
                <StatusIcon className={`h-5 w-5 ${status.color}`} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl">{speechScript.name}</CardTitle>
                {speechScript.description && (
                  <p className="text-muted-foreground">{speechScript.description}</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{speechScript.outline_sections_count} 个大纲讲稿</span>
            </div>
            {timeAgo && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{timeAgo}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {status.label}
            </Badge>
            {speechScript.job_status && speechScript.job_status !== speechScript.status && (
              <Badge variant="secondary" className="text-xs">
                任务: {speechScript.job_status}
              </Badge>
            )}
          </div>

          {speechScript.status === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">生成进度</span>
                <span className="text-muted-foreground">处理中...</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* 辅助信息 */}
          {(speechScript.auxiliary_sources.length > 0 || speechScript.auxiliary_notebooks.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">辅助内容</h4>
              <div className="flex flex-wrap gap-2">
                {speechScript.auxiliary_sources.map((sourceId) => (
                  <Badge key={sourceId} variant="secondary" className="text-xs">
                    Source: {sourceId.slice(-8)}
                  </Badge>
                ))}
                {speechScript.auxiliary_notebooks.map((notebookId) => (
                  <Badge key={notebookId} variant="secondary" className="text-xs">
                    Notebook: {notebookId.slice(-8)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 大纲讲稿列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">大纲讲稿</h2>
          {outlineSections.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReorderDialog(true)}
            >
              重新排序
            </Button>
          )}
        </div>

        <Separator />

        {outlineSections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {speechScript.status === 'processing' ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>正在生成大纲讲稿...</p>
              </div>
            ) : (
              <p>暂无大纲讲稿</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {outlineSections
              .sort((a, b) => a.order_index - b.order_index)
              .map((section, index) => (
                <OutlineSectionCard
                  key={section.id}
                  section={section}
                  speechScriptId={speechScriptId}
                  index={index + 1}
                />
              ))}
          </div>
        )}
      </div>

      {/* 重新排序对话框 */}
      <OutlineSectionReorderDialog
        open={showReorderDialog}
        onOpenChange={setShowReorderDialog}
        outlineSections={outlineSections}
        onReorder={handleReorder}
      />
    </div>
  )
}
