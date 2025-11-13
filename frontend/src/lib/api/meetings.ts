import apiClient from './client'
import { getApiUrl } from '@/lib/config'
import { Meeting, CreateMeetingRequest } from '@/lib/types/meetings'

/**
 * 解析会议资源 URL（图片、音频等）
 * 如果是相对路径，则拼接服务器 API 地址
 */
export async function resolveMeetingAssetUrl(path?: string | null): Promise<string | undefined> {
  if (!path) {
    return undefined
  }

  // 如果已经是完整 URL，直接返回
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const base = await getApiUrl()

  // 如果路径以 / 开头，直接拼接
  if (path.startsWith('/')) {
    return `${base}${path}`
  }

  // 否则添加 /
  return `${base}/${path}`
}

export const meetingsApi = {
  listMeetings: async () => {
    const response = await apiClient.get<Meeting[]>('/meetings')
    return response.data
  },

  createMeeting: async (payload: CreateMeetingRequest) => {
    const response = await apiClient.post<Meeting>('/meetings', payload)
    return response.data
  },

  deleteMeeting: async (meetingId: string) => {
    await apiClient.delete(`/meetings/${meetingId}`)
  },
}

