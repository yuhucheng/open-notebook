import apiClient from './client'
import { Meeting, CreateMeetingRequest } from '@/lib/types/meetings'

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

