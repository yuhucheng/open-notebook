import { useMemo, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { meetingsApi, resolveMeetingAssetUrl } from '@/lib/api/meetings'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { useToast } from '@/lib/hooks/use-toast'
import { Meeting, CreateMeetingRequest, MeetingPodcastEpisode } from '@/lib/types/meetings'

/**
 * 处理单个 episode 的 URL
 */
async function processEpisodeUrls(episode: MeetingPodcastEpisode): Promise<MeetingPodcastEpisode> {
  const [resolvedImageUrl, resolvedAudioUrl] = await Promise.all([
    resolveMeetingAssetUrl(episode.ppt_image_url),
    resolveMeetingAssetUrl(episode.clip_url),
  ])

  return {
    ...episode,
    ppt_image_url: resolvedImageUrl || episode.ppt_image_url,
    clip_url: resolvedAudioUrl || episode.clip_url,
  }
}

/**
 * 处理单个 meeting 的 URL
 */
async function processMeetingUrls(meeting: Meeting): Promise<Meeting> {
  if (!meeting.podcast_episode || meeting.podcast_episode.length === 0) {
    return meeting
  }

  const processedEpisodes = await Promise.all(
    meeting.podcast_episode.map(processEpisodeUrls)
  )

  return {
    ...meeting,
    podcast_episode: processedEpisodes,
  }
}

export function useMeetings() {
  const query = useQuery({
    queryKey: QUERY_KEYS.meetings,
    queryFn: meetingsApi.listMeetings,
  })

  const meetings = useMemo(() => query.data ?? [], [query.data])
  const [processedMeetings, setProcessedMeetings] = useState<Meeting[]>([])

  // 处理 URL 拼接
  useEffect(() => {
    if (meetings.length === 0) {
      setProcessedMeetings([])
      return
    }

    let cancelled = false

    const processUrls = async () => {
      try {
        const processed = await Promise.all(meetings.map(processMeetingUrls))
        if (!cancelled) {
          setProcessedMeetings(processed)
        }
      } catch (error) {
        console.error('处理会议 URL 失败:', error)
        // 如果处理失败，使用原始数据
        if (!cancelled) {
          setProcessedMeetings(meetings)
        }
      }
    }

    void processUrls()

    return () => {
      cancelled = true
    }
  }, [meetings])

  // 按时间排序，最早的在前
  const sortedMeetings = useMemo(() => {
    return [...processedMeetings].sort((a, b) => a.start_time - b.start_time)
  }, [processedMeetings])

  return {
    ...query,
    meetings: sortedMeetings,
  }
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: CreateMeetingRequest) => meetingsApi.createMeeting(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meetings })
      toast({
        title: '会议已创建',
        description: `会议 "${data.theme}" 已成功创建，会议代码: ${data.meeting_code}`,
      })
    },
    onError: () => {
      toast({
        title: '创建失败',
        description: '无法创建会议，请检查输入信息后重试。',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (meetingId: string) => meetingsApi.deleteMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meetings })
      toast({
        title: '会议已删除',
        description: '会议记录已成功删除。',
      })
    },
    onError: () => {
      toast({
        title: '删除失败',
        description: '无法删除会议记录，请稍后重试。',
        variant: 'destructive',
      })
    },
  })
}

export function formatMeetingTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN,
  })
}

export function formatMeetingDuration(startTime: number, endTime: number): string {
  const duration = endTime - startTime
  const minutes = Math.floor(duration / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return `${hours}小时${remainingMinutes > 0 ? remainingMinutes : ''}分钟`
  }
  return `${minutes}分钟`
}

