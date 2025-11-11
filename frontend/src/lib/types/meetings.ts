export interface Meeting {
  id: string
  theme: string
  start_time: number
  end_time: number
  speech_ids: string[]
  meeting_code: string
}

export interface CreateMeetingRequest {
  theme: string
  start_time: number
  end_time: number
  speech_ids: string[]
}

