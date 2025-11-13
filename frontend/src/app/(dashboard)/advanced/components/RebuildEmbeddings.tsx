'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { embeddingApi } from '@/lib/api/embedding'
import type { RebuildEmbeddingsRequest, RebuildStatusResponse } from '@/lib/api/embedding'

export function RebuildEmbeddings() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'existing' | 'all'>('existing')
  const [includeSources, setIncludeSources] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeInsights, setIncludeInsights] = useState(true)
  const [commandId, setCommandId] = useState<string | null>(null)
  const [status, setStatus] = useState<RebuildStatusResponse | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Rebuild mutation
  const rebuildMutation = useMutation({
    mutationFn: async (request: RebuildEmbeddingsRequest) => {
      return embeddingApi.rebuildEmbeddings(request)
    },
    onSuccess: (data) => {
      setCommandId(data.command_id)
      // Start polling for status
      startPolling(data.command_id)
    }
  })

  // Start polling for rebuild status
  const startPolling = (cmdId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const statusData = await embeddingApi.getRebuildStatus(cmdId)
        setStatus(statusData)

        // Stop polling if completed or failed
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          stopPolling()
        }
      } catch (error) {
        console.error('Failed to fetch rebuild status:', error)
      }
    }, 5000) // Poll every 5 seconds

    setPollingInterval(interval)
  }

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  const handleStartRebuild = () => {
    const request: RebuildEmbeddingsRequest = {
      mode,
      include_sources: includeSources,
      include_notes: includeNotes,
      include_insights: includeInsights
    }

    rebuildMutation.mutate(request)
  }

  const handleReset = () => {
    stopPolling()
    setCommandId(null)
    setStatus(null)
    rebuildMutation.reset()
  }

  const isAnyTypeSelected = includeSources || includeNotes || includeInsights
  const isRebuildActive = commandId && status && (status.status === 'queued' || status.status === 'running')

  const progressData = status?.progress
  const stats = status?.stats

  const totalItems = progressData?.total_items ?? progressData?.total ?? 0
  const processedItems = progressData?.processed_items ?? progressData?.processed ?? 0
  const derivedProgressPercent = progressData?.percentage ?? (totalItems > 0 ? (processedItems / totalItems) * 100 : 0)
  const progressPercent = Number.isFinite(derivedProgressPercent) ? derivedProgressPercent : 0

  const sourcesProcessed = stats?.sources_processed ?? stats?.sources ?? 0
  const notesProcessed = stats?.notes_processed ?? stats?.notes ?? 0
  const insightsProcessed = stats?.insights_processed ?? stats?.insights ?? 0
  const failedItems = stats?.failed_items ?? stats?.failed ?? 0

  const computedDuration = status?.started_at && status?.completed_at
    ? (new Date(status.completed_at).getTime() - new Date(status.started_at).getTime()) / 1000
    : undefined
  const processingTimeSeconds = stats?.processing_time ?? computedDuration

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔄 {t('advanced.rebuildEmbeddings')}
        </CardTitle>
        <CardDescription>
          {t('advanced.rebuildEmbeddingsDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Form */}
        {!isRebuildActive && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="mode">{t('advanced.rebuildMode')}</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as 'existing' | 'all')}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">{t('advanced.existing')}</SelectItem>
                  <SelectItem value="all">{t('advanced.all')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {mode === 'existing'
                  ? t('advanced.existingDesc')
                  : t('advanced.allDesc')}
              </p>
            </div>

            <div className="space-y-3">
              <Label>{t('advanced.includeInRebuild')}</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sources"
                    checked={includeSources}
                    onCheckedChange={(checked) => setIncludeSources(checked === true)}
                  />
                  <Label htmlFor="sources" className="font-normal cursor-pointer">
                    {t('advanced.sources')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={includeNotes}
                    onCheckedChange={(checked) => setIncludeNotes(checked === true)}
                  />
                  <Label htmlFor="notes" className="font-normal cursor-pointer">
                    {t('advanced.notes')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insights"
                    checked={includeInsights}
                    onCheckedChange={(checked) => setIncludeInsights(checked === true)}
                  />
                  <Label htmlFor="insights" className="font-normal cursor-pointer">
                    {t('advanced.insights')}
                  </Label>
                </div>
              </div>
              {!isAnyTypeSelected && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('advanced.selectAtLeastOne')}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button
              onClick={handleStartRebuild}
              disabled={!isAnyTypeSelected || rebuildMutation.isPending}
              className="w-full"
            >
              {rebuildMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('advanced.startingRebuild')}
                </>
              ) : (
                t('advanced.startRebuild')
              )}
            </Button>

            {rebuildMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('advanced.failedToStartRebuild', { error: (rebuildMutation.error as Error)?.message || t('advanced.unknown') })}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Status Display */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status.status === 'queued' && <Clock className="h-5 w-5 text-yellow-500" />}
                {status.status === 'running' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                {status.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {status.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                <div className="flex flex-col">
                  <span className="font-medium">
                    {status.status === 'queued' && t('advanced.queued')}
                    {status.status === 'running' && t('advanced.running')}
                    {status.status === 'completed' && t('advanced.completed')}
                    {status.status === 'failed' && t('advanced.failed')}
                  </span>
                  {status.status === 'running' && (
                    <span className="text-sm text-muted-foreground">
                      {t('advanced.runningDesc')}
                    </span>
                  )}
                </div>
              </div>
              {(status.status === 'completed' || status.status === 'failed') && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  {t('advanced.startNewRebuild')}
                </Button>
              )}
            </div>

            {progressData && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('advanced.progress')}</span>
                  <span className="font-medium">
                    {t('advanced.items', { processed: processedItems, total: totalItems, percent: progressPercent.toFixed(1) })}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {failedItems > 0 && (
                  <p className="text-sm text-yellow-600">
                    {t('advanced.itemsFailed', { count: failedItems })}
                  </p>
                )}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('advanced.sources')}</p>
                  <p className="text-2xl font-bold">{sourcesProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('advanced.notes')}</p>
                  <p className="text-2xl font-bold">{notesProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('advanced.insights')}</p>
                  <p className="text-2xl font-bold">{insightsProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('advanced.time')}</p>
                  <p className="text-2xl font-bold">
                    {processingTimeSeconds !== undefined ? `${processingTimeSeconds.toFixed(1)}s` : '—'}
                  </p>
                </div>
              </div>
            )}

            {status.error_message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{status.error_message}</AlertDescription>
              </Alert>
            )}

            {status.started_at && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{t('advanced.started', { time: new Date(status.started_at).toLocaleString() })}</p>
                {status.completed_at && (
                  <p>{t('advanced.completedAt', { time: new Date(status.completed_at).toLocaleString() })}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="when">
            <AccordionTrigger>{t('advanced.whenRebuild')}</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>{t('advanced.whenRebuildDesc')}</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>{t('advanced.switchingModels')}</strong></li>
                <li><strong>{t('advanced.upgradingVersions')}</strong></li>
                <li><strong>{t('advanced.fixingCorrupted')}</strong></li>
                <li><strong>{t('advanced.afterBulkImports')}</strong></li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="time">
            <AccordionTrigger>{t('advanced.howLongRebuild')}</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>{t('advanced.processingTimeDepends')}</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t('advanced.numberOfItems')}</li>
                <li>{t('advanced.modelSpeed')}</li>
                <li>{t('advanced.rateLimits')}</li>
                <li>{t('advanced.systemResources')}</li>
              </ul>
              <p className="mt-2"><strong>{t('advanced.typicalRates')}</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>{t('advanced.localModels')}</strong></li>
                <li><strong>{t('advanced.cloudApis')}</strong></li>
                <li><strong>{t('advanced.sourcesSlower')}</strong></li>
              </ul>
              <p className="mt-2"><em>{t('advanced.rebuildExample')}</em></p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="safe">
            <AccordionTrigger>{t('advanced.isSafeRebuild')}</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>{t('advanced.yesRebuildSafe')}</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>✅ <strong>{t('advanced.idempotent')}</strong></li>
                <li>✅ <strong>{t('advanced.doesntDeleteContent')}</strong></li>
                <li>✅ <strong>{t('advanced.canRunAnytime')}</strong></li>
                <li>✅ <strong>{t('advanced.handlesErrorsGracefully')}</strong></li>
              </ul>
              <p className="mt-2">⚠️ <strong>{t('advanced.largeRebuildsWarning')}</strong></p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
