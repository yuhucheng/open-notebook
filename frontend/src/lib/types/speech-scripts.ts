export interface SpeechScriptResponse {
  id: string
  name: string
  description?: string
  source_id: string
  auxiliary_sources: string[]
  auxiliary_notebooks: string[]
  status: 'draft' | 'processing' | 'completed' | 'failed'
  created?: string
  updated?: string
  job_status?: string
  outline_sections_count: number
}

export interface OutlineSectionResponse {
  id: string
  speech_script_id: string
  page_number: number
  title: string
  outline: string
  script: string
  image_path?: string
  order_index: number
  created?: string
  updated?: string
}



