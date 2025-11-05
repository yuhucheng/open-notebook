import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { speechScriptsApi } from '@/lib/api/speech-scripts'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { SpeechScriptResponse } from '@/lib/types/speech-scripts'

export function useSpeechScripts() {
  const query = useQuery({
    queryKey: QUERY_KEYS.speechScripts,
    queryFn: speechScriptsApi.list,
    refetchInterval: (data) => {
      // If any speech scripts are processing, refetch every 5 seconds
      const hasProcessing = data?.speech_scripts?.some(
        (script: SpeechScriptResponse) => script.status === 'processing'
      )
      return hasProcessing ? 5000 : false
    },
  })

  const speechScripts = query.data?.speech_scripts ?? []
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
