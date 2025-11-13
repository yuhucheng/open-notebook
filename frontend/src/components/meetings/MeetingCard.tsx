'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { InfoIcon, Trash2, Calendar, Clock, Hash } from 'lucide-react'

import { Meeting } from '@/lib/types/meetings'
import { formatMeetingTime, formatMeetingDuration } from '@/lib/hooks/use-meetings'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface MeetingCardProps {
  meeting: Meeting
  onDelete: (meetingId: string) => Promise<void> | void
  deleting?: boolean
}

export function MeetingCard({ meeting, onDelete, deleting }: MeetingCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const startDate = new Date(meeting.start_time)
  const endDate = new Date(meeting.end_time)
  const createdLabel = formatMeetingTime(meeting.start_time)
  const duration = formatMeetingDuration(meeting.start_time, meeting.end_time)

  const handleDelete = () => {
    void onDelete(meeting.id)
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {meeting.theme}
              </h3>
              <Badge variant="outline" className="text-xs">
                会议代码: {meeting.meeting_code}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(startDate, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                时长: {duration}
              </div>
              {meeting.postcat_ids?.length && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {meeting.postcat_ids.length} 个播客
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              创建于 {createdLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <InfoIcon className="mr-2 h-4 w-4" /> 详情
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[min(90vw,720px)] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{meeting.theme}</DialogTitle>
                  <DialogDescription>
                    会议代码: {meeting.meeting_code}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto max-h-[70vh]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">开始时间</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(startDate, 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">结束时间</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(endDate, 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">会议时长</h4>
                      <p className="text-sm text-muted-foreground">{duration}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">会议代码</h4>
                      <p className="text-sm text-muted-foreground">{meeting.meeting_code}</p>
                    </div>
                  </div>

                  {meeting.postcat_ids?.length && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">关联播客</h4>
                      <div className="flex flex-wrap gap-2">
                        {meeting.postcat_ids.map((podcastId, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {podcastId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除会议？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将永久删除会议记录 "{meeting.theme}"。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? '删除中…' : '删除'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

