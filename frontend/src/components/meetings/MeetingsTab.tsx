'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          <h2 className="text-xl font-semibold">{t('meetings.meetingsOverview')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('meetings.meetingsOverviewDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowGenerateDialog(true)}>
            {t('meetings.createMeeting')}
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
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SummaryBadge label={t('common.total')} value={meetings.length} />
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('meetings.loadMeetingsFailed')}</AlertTitle>
          <AlertDescription>
            {t('meetings.loadMeetingsFailedDesc')}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('meetings.loadingMeetings')}
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t('meetings.noMeetings')}
          </p>
        </div>
      ) : null}

      {meetings.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight">{t('meetings.allMeetings')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('meetings.allMeetingsDesc')}
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

