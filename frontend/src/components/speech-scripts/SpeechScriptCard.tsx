'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MoreHorizontal,
  Play,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { SpeechScriptResponse } from '@/lib/types/speech-scripts'

interface SpeechScriptCardProps {
  speechScript: SpeechScriptResponse
  onDelete: (speechScriptId: string) => void
  deleting: boolean
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
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: '失败',
  },
} as const

export function SpeechScriptCard({ speechScript, onDelete, deleting }: SpeechScriptCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const status = statusConfig[speechScript.status as keyof typeof statusConfig] || statusConfig.draft
  const StatusIcon = status.icon

  const handleDelete = () => {
    onDelete(speechScript.id)
    setShowDeleteConfirm(false)
  }

  const createdAt = speechScript.created ? new Date(speechScript.created) : null
  const timeAgo = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true, locale: zhCN }) : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${status.bgColor}`}>
              <StatusIcon className={`h-4 w-4 ${status.color}`} />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">{speechScript.name}</CardTitle>
              <CardDescription className="text-sm">
                {speechScript.description || '无描述'}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Progress value={undefined} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex items-center gap-2 w-full">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/speech-scripts/${speechScript.id}`}>
              <Play className="mr-2 h-4 w-4" />
              查看详情
            </Link>
          </Button>
        </div>
      </CardFooter>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-sm text-muted-foreground mb-4">
              确定要删除演讲稿 &ldquo;{speechScript.name}&rdquo; 吗？此操作无法撤销。
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
