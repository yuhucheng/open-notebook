export interface Meeting {
  id: string
  theme: string
  start_time: number
  end_time: number
  postcat_ids: string[]
  meeting_code: string
  podcast_episode: MeetingPodcastEpisode[]
}

export interface MeetingPodcastEpisode {
  clip_filename: string
  clip_url: string
  outline: string
  page_number: number
  ppt_image_url: string
  script: string
  title: string
}

export interface CreateMeetingRequest {
  theme: string
  start_time: number
  end_time: number
  postcat_ids: string[]
}

