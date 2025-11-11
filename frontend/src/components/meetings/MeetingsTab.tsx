'use client'

import { useCallback, useState } from 'react'
import { AlertCircle, Loader2, RefreshCcw } from 'lucide-react'

import { useMeetings, useDeleteMeeting } from '@/lib/hooks/use-meetings'
import { MeetingCard } from '@/components/meetings/MeetingCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GenerateMeetingDialog } from '@/components/meetings/GenerateMeetingDialog'

function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <Badge variant="outline" className="font-medium">
      <span className="text-muted-foreground mr-1.5">{label}</span>
      <span className="text-foreground">{value}</span>
    </Badge>
  )
}

export function MeetingsTab() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const {
    meetings,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useMeetings()
  const deleteMeeting = useDeleteMeeting()

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleDelete = useCallback(
    (meetingId: string) => deleteMeeting.mutateAsync(meetingId),
    [deleteMeeting]
  )

  const emptyState = !isLoading && meetings.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">会议概览</h2>
          <p className="text-sm text-muted-foreground">
            监控会议内容生成任务并查看最终成果。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowGenerateDialog(true)}>
            创建会议
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
        <SummaryBadge label="总计" value={meetings.length} />
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载会议失败</AlertTitle>
          <AlertDescription>
            无法获取最新的会议内容。请稍后再试。
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载会议中…
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            还没有会议内容。从笔记本或来源聊天界面生成第一个会议内容。
          </p>
        </div>
      ) : null}

      {meetings.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight">所有会议</h3>
            <p className="text-sm text-muted-foreground">
              按时间倒序排列的会议记录。
            </p>
          </div>
          <Separator />
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onDelete={handleDelete}
                deleting={deleteMeeting.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <GenerateMeetingDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
      />
    </div>
  )
}

