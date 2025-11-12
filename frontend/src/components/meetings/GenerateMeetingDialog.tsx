'use client'

import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'

import { useCreateMeeting, useMeetings } from '@/lib/hooks/use-meetings'
import { usePodcastEpisodes } from '@/lib/hooks/use-podcasts'
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
import { MeetingTimeSelector } from './MeetingTimeSelector'

interface GenerateMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

export function GenerateMeetingDialog({
  open,
  onOpenChange,
}: GenerateMeetingDialogProps) {
  const [theme, setTheme] = useState('')
  
  // 使用独立的日期和时间状态
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  
  const [startTime, setStartTime] = useState(() => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    const hours = roundedMinutes >= 60 ? now.getHours() + 1 : now.getHours()
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes
    return `${String(hours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`
  })
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  
  const [endTime, setEndTime] = useState(() => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    const hours = roundedMinutes >= 60 ? now.getHours() + 1 : now.getHours()
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes
    const endHours = finalMinutes === 45 ? hours + 1 : hours
    const endMinutes = finalMinutes === 45 ? 0 : finalMinutes + 15
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  })
  
  const [selectedPodcastIds, setSelectedPodcastIds] = useState<string[]>([])

  const createMeeting = useCreateMeeting()
  const { episodes, isLoading: loadingPodcasts } = usePodcastEpisodes({ autoRefresh: false })

  // 组合日期和时间为时间戳
  const startTimestamp = useMemo(() => {
    return parseDateTimeLocal(`${startDate}T${startTime}`)
  }, [startDate, startTime])

  const endTimestamp = useMemo(() => {
    return parseDateTimeLocal(`${endDate}T${endTime}`)
  }, [endDate, endTime])

  // 只显示已完成的播客
  const completedPodcasts = useMemo(() => {
    return episodes.filter((episode) => episode.job_status === 'completed')
  }, [episodes])

  // 计算会议时长
  const meetingDuration = useMemo(() => {
    return endTimestamp - startTimestamp
  }, [startTimestamp, endTimestamp])

  // 验证时长是否满足最短要求
  const durationValid = meetingDuration >= MIN_MEETING_DURATION_MS

  // 检查是否预约了过去的时间
  const isPastTime = useMemo(() => {
    return startTimestamp < Date.now()
  }, [startTimestamp])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!theme.trim()) {
      return
    }

    if (endTimestamp <= startTimestamp) {
      return
    }

    if (!durationValid) {
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
        postcat_ids: selectedPodcastIds,
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
    
    // 重置开始日期和时间
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setStartDate(`${year}-${month}-${day}`)
    
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    const hours = roundedMinutes >= 60 ? now.getHours() + 1 : now.getHours()
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes
    setStartTime(`${String(hours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`)
    
    // 重置结束日期和时间
    setEndDate(`${year}-${month}-${day}`)
    const endHours = finalMinutes === 45 ? hours + 1 : hours
    const endMinutes = finalMinutes === 45 ? 0 : finalMinutes + 15
    setEndTime(`${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`)
    
    setSelectedPodcastIds([])
  }

  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    
    // 如果结束日期早于新的开始日期，自动调整结束日期
    if (value > endDate) {
      setEndDate(value)
    }
  }

  const handleStartTimeChange = (value: string) => {
    setStartTime(value)
    
    // 如果是同一天且结束时间早于开始时间，自动调整结束时间
    if (startDate === endDate) {
      const newStartTimestamp = parseDateTimeLocal(`${startDate}T${value}`)
      const currentEndTimestamp = parseDateTimeLocal(`${endDate}T${endTime}`)
      
      if (currentEndTimestamp <= newStartTimestamp) {
        const newEnd = new Date(newStartTimestamp)
        newEnd.setMinutes(newEnd.getMinutes() + 15)
        const endHours = String(newEnd.getHours()).padStart(2, '0')
        const endMinutes = String(newEnd.getMinutes()).padStart(2, '0')
        setEndTime(`${endHours}:${endMinutes}`)
      }
    }
  }

  const handleEndDateChange = (value: string) => {
    setEndDate(value)
  }

  const handleEndTimeChange = (value: string) => {
    setEndTime(value)
  }

  const handlePodcastToggle = (podcastId: string) => {
    setSelectedPodcastIds((prev) =>
      prev.includes(podcastId)
        ? prev.filter((id) => id !== podcastId)
        : [...prev, podcastId]
    )
  }

  const isSubmitting = createMeeting.isPending
  const canSubmit =
    theme.trim() &&
    endTimestamp > startTimestamp &&
    durationValid &&
    !isPastTime

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>创建会议</DialogTitle>
          <DialogDescription>
            预约一个新的会议，选择会议主题、时间和关联的播客。

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

              <div className="space-y-4">
                <MeetingTimeSelector
                  label="开始时间 *"
                  date={startDate}
                  time={startTime}
                  onDateChange={handleStartDateChange}
                  onTimeChange={handleStartTimeChange}
                  disabled={isSubmitting}
                  description="选择会议开始的日期和时间（15分钟间隔）。"
                  type="start"
                />

                <MeetingTimeSelector
                  label="结束时间 *"
                  date={endDate}
                  time={endTime}
                  onDateChange={handleEndDateChange}
                  onTimeChange={handleEndTimeChange}
                  disabled={isSubmitting}
                  description="选择会议结束的日期和时间。最短时长为15分钟。"
                  type="end"
                  startDate={startDate}
                  startTime={startTime}
                />
              </div>

              {endTimestamp <= startTimestamp && (
                <Alert variant="destructive">
                  <AlertDescription>
                    结束时间必须晚于开始时间。
                  </AlertDescription>
                </Alert>
              )}

              {!durationValid && endTimestamp > startTimestamp && (
                <Alert variant="destructive">
                  <AlertDescription>
                    会议时长至少为15分钟。当前时长为{' '}
                    {Math.floor(meetingDuration / 60000)} 分钟。
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
                <Label>关联播客（可选）</Label>
                {loadingPodcasts ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载播客中...
                  </div>
                ) : completedPodcasts.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">
                    暂无已完成的播客。请先创建并完成播客。
                  </p>
                ) : (
                  <div className="rounded-md border p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {completedPodcasts.map((podcast) => (
                      <div
                        key={podcast.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
                      >
                        <Checkbox
                          id={`podcast-${podcast.id}`}
                          checked={selectedPodcastIds.includes(podcast.id)}
                          onCheckedChange={() => handlePodcastToggle(podcast.id)}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor={`podcast-${podcast.id}`}
                          className="flex-1 cursor-pointer text-sm font-normal"
                        >
                          {podcast.name}
                          {podcast.briefing && (
                            <span className="text-muted-foreground ml-2 text-xs truncate">
                              - {podcast.briefing.substring(0, 50)}{podcast.briefing.length > 50 ? '...' : ''}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  选择要关联到此会议的播客。只有已完成的播客才会显示。
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

