'use client'

import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'

import { useCreateMeeting, useMeetings } from '@/lib/hooks/use-meetings'
import { useSpeechScripts } from '@/lib/hooks/use-speech-scripts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GenerateMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 会议间隔时间（毫秒）：15分钟
const MEETING_INTERVAL_MS = 15 * 60 * 1000
// 最短会议时长（毫秒）：15分钟
const MIN_MEETING_DURATION_MS = 15 * 60 * 1000

// 将 Date 对象转换为 datetime-local 输入格式 (YYYY-MM-DDTHH:mm)
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// 将 datetime-local 输入值转换为时间戳（毫秒）
function parseDateTimeLocal(value: string): number {
  return new Date(value).getTime()
}

// 检查会议时间是否与已有会议冲突（考虑15分钟间隔）
function hasTimeConflict(
  newStartTime: number,
  newEndTime: number,
  existingMeetings: Array<{ start_time: number; end_time: number }>
): boolean {
  // 新会议的开始和结束时间都要考虑15分钟间隔
  const newStartWithInterval = newStartTime - MEETING_INTERVAL_MS
  const newEndWithInterval = newEndTime + MEETING_INTERVAL_MS

  return existingMeetings.some((meeting) => {
    // 检查新会议是否与已有会议的时间范围重叠（考虑间隔）
    return (
      (newStartWithInterval < meeting.end_time && newEndWithInterval > meeting.start_time) ||
      (meeting.start_time < newEndWithInterval && meeting.end_time > newStartWithInterval)
    )
  })
}

export function GenerateMeetingDialog({
  open,
  onOpenChange,
}: GenerateMeetingDialogProps) {
  const [theme, setTheme] = useState('')
  const [startTime, setStartTime] = useState(() => {
    // 默认开始时间为当前时间，向上取整到最近的15分钟
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    now.setMinutes(roundedMinutes)
    now.setSeconds(0)
    now.setMilliseconds(0)
    return formatDateTimeLocal(now)
  })
  const [endTime, setEndTime] = useState(() => {
    // 默认结束时间为开始时间后15分钟（最短时长）
    const defaultEnd = new Date(parseDateTimeLocal(startTime))
    defaultEnd.setMinutes(defaultEnd.getMinutes() + 15)
    return formatDateTimeLocal(defaultEnd)
  })
  const [selectedSpeechIds, setSelectedSpeechIds] = useState<string[]>([])

  const createMeeting = useCreateMeeting()
  const { speechScripts, isLoading: loadingSpeechScripts } = useSpeechScripts()
  const { meetings: existingMeetings } = useMeetings()

  // 只显示已完成的演讲稿
  const completedSpeechScripts = useMemo(() => {
    return speechScripts.filter((script) => script.status === 'completed')
  }, [speechScripts])

  // 计算会议时长
  const meetingDuration = useMemo(() => {
    const start = parseDateTimeLocal(startTime)
    const end = parseDateTimeLocal(endTime)
    return end - start
  }, [startTime, endTime])

  // 检查时间冲突
  const timeConflict = useMemo(() => {
    const start = parseDateTimeLocal(startTime)
    const end = parseDateTimeLocal(endTime)
    if (end <= start) return null
    return hasTimeConflict(start, end, existingMeetings)
  }, [startTime, endTime, existingMeetings])

  // 验证时长是否满足最短要求
  const durationValid = meetingDuration >= MIN_MEETING_DURATION_MS

  // 检查是否预约了过去的时间
  const isPastTime = useMemo(() => {
    const start = parseDateTimeLocal(startTime)
    return start < Date.now()
  }, [startTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!theme.trim()) {
      return
    }

    const startTimestamp = parseDateTimeLocal(startTime)
    const endTimestamp = parseDateTimeLocal(endTime)

    if (endTimestamp <= startTimestamp) {
      return
    }

    if (!durationValid) {
      return
    }

    if (timeConflict) {
      return
    }

    if (isPastTime) {
      return
    }

    try {
      await createMeeting.mutateAsync({
        theme: theme.trim(),
        start_time: startTimestamp,
        end_time: endTimestamp,
        speech_ids: selectedSpeechIds,
      })
      onOpenChange(false)
      resetForm()
    } catch (error) {
      // 错误处理由 hook 中的 toast 完成
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setTheme('')
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    now.setMinutes(roundedMinutes)
    now.setSeconds(0)
    now.setMilliseconds(0)
    const defaultStart = formatDateTimeLocal(now)
    setStartTime(defaultStart)
    const defaultEnd = new Date(parseDateTimeLocal(defaultStart))
    defaultEnd.setMinutes(defaultEnd.getMinutes() + 15)
    setEndTime(formatDateTimeLocal(defaultEnd))
    setSelectedSpeechIds([])
  }

  const handleStartTimeChange = (value: string) => {
    // 将时间对齐到15分钟间隔
    const date = new Date(value)
    const minutes = date.getMinutes()
    const roundedMinutes = Math.round(minutes / 15) * 15
    date.setMinutes(roundedMinutes)
    date.setSeconds(0)
    date.setMilliseconds(0)
    
    const alignedValue = formatDateTimeLocal(date)
    setStartTime(alignedValue)
    
    // 如果结束时间早于新的开始时间，自动调整结束时间
    const newStart = parseDateTimeLocal(alignedValue)
    const currentEnd = parseDateTimeLocal(endTime)
    if (currentEnd <= newStart) {
      const newEnd = new Date(newStart)
      newEnd.setMinutes(newEnd.getMinutes() + 15)
      setEndTime(formatDateTimeLocal(newEnd))
    }
  }

  const handleEndTimeChange = (value: string) => {
    // 将时间对齐到15分钟间隔
    const date = new Date(value)
    const minutes = date.getMinutes()
    const roundedMinutes = Math.round(minutes / 15) * 15
    date.setMinutes(roundedMinutes)
    date.setSeconds(0)
    date.setMilliseconds(0)
    
    const alignedValue = formatDateTimeLocal(date)
    setEndTime(alignedValue)
  }

  const handleSpeechScriptToggle = (speechId: string) => {
    setSelectedSpeechIds((prev) =>
      prev.includes(speechId)
        ? prev.filter((id) => id !== speechId)
        : [...prev, speechId]
    )
  }

  const isSubmitting = createMeeting.isPending
  const canSubmit =
    theme.trim() &&
    parseDateTimeLocal(endTime) > parseDateTimeLocal(startTime) &&
    durationValid &&
    !timeConflict &&
    !isPastTime

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>创建会议</DialogTitle>
          <DialogDescription>
            预约一个新的会议，选择会议主题、时间和关联的演讲稿。
            <br />
            <span className="text-xs text-muted-foreground">
              最短会议时长为15分钟，每场会议之间至少间隔15分钟。
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-theme">会议主题 *</Label>
                <Input
                  id="meeting-theme"
                  placeholder="输入会议主题"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  为这次会议起一个主题名称。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meeting-start-time">开始时间 *</Label>
                  <Input
                    id="meeting-start-time"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    required
                    step={900}
                    min={formatDateTimeLocal(new Date())}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    时间将自动对齐到15分钟间隔。不可预约过去的时间。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-end-time">结束时间 *</Label>
                  <Input
                    id="meeting-end-time"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    required
                    min={startTime}
                    step={900}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    时间将自动对齐到15分钟间隔。最短时长为15分钟。
                  </p>
                </div>
              </div>

              {parseDateTimeLocal(endTime) <= parseDateTimeLocal(startTime) && (
                <Alert variant="destructive">
                  <AlertDescription>
                    结束时间必须晚于开始时间。
                  </AlertDescription>
                </Alert>
              )}

              {!durationValid && parseDateTimeLocal(endTime) > parseDateTimeLocal(startTime) && (
                <Alert variant="destructive">
                  <AlertDescription>
                    会议时长至少为15分钟。当前时长为{' '}
                    {Math.floor(meetingDuration / 60000)} 分钟。
                  </AlertDescription>
                </Alert>
              )}

              {timeConflict && (
                <Alert variant="destructive">
                  <AlertDescription>
                    该时间段与已有会议冲突。每场会议之间至少需要间隔15分钟。
                  </AlertDescription>
                </Alert>
              )}

              {isPastTime && (
                <Alert variant="destructive">
                  <AlertDescription>
                    无法预约过去的时间。请选择当前时间之后的时间。
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>关联演讲稿（可选）</Label>
                {loadingSpeechScripts ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载演讲稿中...
                  </div>
                ) : completedSpeechScripts.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">
                    暂无已完成的演讲稿。请先创建并完成演讲稿。
                  </p>
                ) : (
                  <div className="rounded-md border p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {completedSpeechScripts.map((script) => (
                      <div
                        key={script.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
                      >
                        <Checkbox
                          id={`speech-${script.id}`}
                          checked={selectedSpeechIds.includes(script.id)}
                          onCheckedChange={() => handleSpeechScriptToggle(script.id)}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor={`speech-${script.id}`}
                          className="flex-1 cursor-pointer text-sm font-normal"
                        >
                          {script.name}
                          {script.description && (
                            <span className="text-muted-foreground ml-2">
                              - {script.description}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  选择要关联到此会议的演讲稿。只有已完成的演讲稿才会显示。
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建会议'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

