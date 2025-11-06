import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { speechScriptsApi } from '@/lib/api/speech-scripts'
import { QUERY_KEYS } from '@/lib/api/query-client'

export function useSpeechScripts() {
  const query = useQuery({
    queryKey: QUERY_KEYS.speechScripts,
    queryFn: speechScriptsApi.list,
  })

  const speechScripts = Array.isArray(query.data) ? query.data : []
  const statusGroups = {
    processing: speechScripts.filter((script) => script.status === 'processing'),
    completed: speechScripts.filter((script) => script.status === 'completed'),
    failed: speechScripts.filter((script) => script.status === 'failed'),
    draft: speechScripts.filter((script) => script.status === 'draft'),
  }

  const statusCounts = {
    total: speechScripts.length,
    processing: statusGroups.processing.length,
    completed: statusGroups.completed.length,
    failed: statusGroups.failed.length,
    draft: statusGroups.draft.length,
  }

  return {
    ...query,
    speechScripts,
    statusGroups,
    statusCounts,
  }
}

export function useSpeechScript(speechScriptId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.speechScript(speechScriptId),
    queryFn: () => speechScriptsApi.get(speechScriptId),
    enabled: !!speechScriptId,
  })
}

export function useGenerateSpeechScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: speechScriptsApi.generate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.speechScripts })
    },
  })
}

export function useDeleteSpeechScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: speechScriptsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.speechScripts })
    },
  })
}

export function useUpdateOutlineSectionOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      speechScriptId,
      sectionId,
      orderIndex,
    }: {
      speechScriptId: string
      sectionId: string
      orderIndex: number
    }) =>
      speechScriptsApi.updateOutlineSectionOrder(speechScriptId, sectionId, orderIndex),
    onSuccess: (_, { speechScriptId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.speechScript(speechScriptId),
      })
    },
  })
}

export function useUpdateSpeechScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      speechScriptId,
      updateData,
    }: {
      speechScriptId: string
      updateData: { name?: string; description?: string }
    }) =>
      speechScriptsApi.update(speechScriptId, updateData),
    onSuccess: (_, { speechScriptId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.speechScript(speechScriptId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.speechScripts,
      })
    },
  })
}

export function useUpdateOutlineSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      speechScriptId,
      sectionId,
      updateData,
    }: {
      speechScriptId: string
      sectionId: string
      updateData: { title?: string; outline?: string; script?: string }
    }) =>
      speechScriptsApi.updateOutlineSection(speechScriptId, sectionId, updateData),
    onSuccess: (_, { speechScriptId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.speechScript(speechScriptId),
      })
    },
  })
}
