import { apiClient } from './client'
import { SpeechScriptResponse, OutlineSectionResponse } from '@/lib/types/speech-scripts'

export interface GenerateSpeechScriptRequest {
  name: string
  description?: string
  source_id: string
  auxiliary_sources: string[]
  auxiliary_notebooks: string[]
  model_id?: string
}

export interface SpeechScriptDetailResponse {
  speech_script: SpeechScriptResponse
  outline_sections: OutlineSectionResponse[]
}

export interface GenerateSpeechScriptResponse {
  job_id: string
  status: string
  message: string
}

export const speechScriptsApi = {
  list: async (): Promise<SpeechScriptResponse[]> => {
    const response = await apiClient.get('/speech-scripts')
    return response.data
  },

  get: async (speechScriptId: string): Promise<SpeechScriptDetailResponse> => {
    const response = await apiClient.get(`/speech-scripts/${speechScriptId}`)
    return response.data
  },

  generate: async (
    request: GenerateSpeechScriptRequest
  ): Promise<GenerateSpeechScriptResponse> => {
    const response = await apiClient.post('/speech-scripts/generate', request)
    return response.data
  },

  delete: async (speechScriptId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/speech-scripts/${speechScriptId}`)
    return response.data
  },

  getJobStatus: async (jobId: string): Promise<{
    job_id: string
    status: string
    result?: unknown
    error_message?: string
    created?: string
    updated?: string
    progress?: number
  }> => {
    const response = await apiClient.get(`/speech-scripts/jobs/${jobId}`)
    return response.data
  },

  updateOutlineSectionOrder: async (
    speechScriptId: string,
    sectionId: string,
    orderIndex: number
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(
      `/speech-scripts/${speechScriptId}/sections/${sectionId}/order`,
      { order_index: orderIndex }
    )
    return response.data
  },

  getOutlineSectionImage: async (
    speechScriptId: string,
    sectionId: string
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/speech-scripts/${speechScriptId}/images/${sectionId}`,
      { responseType: 'blob' }
    )
    return response.data
  },

  update: async (
    speechScriptId: string,
    updateData: { name?: string; description?: string }
  ): Promise<{ message: string; id: string; name: string; description?: string; updated?: string }> => {
    const response = await apiClient.put(`/speech-scripts/${speechScriptId}`, updateData)
    return response.data
  },

  updateOutlineSection: async (
    speechScriptId: string,
    sectionId: string,
    updateData: { title?: string; outline?: string; script?: string }
  ): Promise<{ message: string; id: string; title: string; outline: string; script: string; updated?: string }> => {
    const response = await apiClient.put(`/speech-scripts/${speechScriptId}/sections/${sectionId}`, updateData)
    return response.data
  },

  duplicate: async (
    speechScriptId: string,
    newName?: string
  ): Promise<{ message: string; original_speech_script_id: string; new_speech_script_id: string }> => {
    const response = await apiClient.post(`/speech-scripts/${speechScriptId}/duplicate`, newName ? { name: newName } : {})
    return response.data
  },
}
