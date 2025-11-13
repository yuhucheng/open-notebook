export interface Meeting {
  id: string
  theme: string
  start_time: number
  end_time: number
  postcat_ids: string[]
  meeting_code: string
}

export interface CreateMeetingRequest {
  theme: string
  start_time: number
  end_time: number
  postcat_ids: string[]
}

