'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useGenerateSpeechScript } from '@/lib/hooks/use-speech-scripts'
import { chatApi } from '@/lib/api/chat'
import { sourcesApi } from '@/lib/api/sources'
import { notesApi } from '@/lib/api/notes'
import { useQuery } from '@tanstack/react-query'
import { BuildContextRequest, NoteResponse, SourceListResponse } from '@/lib/types/api'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { useToast } from '@/lib/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface NotebookSelection {
  sources: Record<string, boolean>
  notes: Record<string, boolean>
}

// Helper function to format large numbers with K/M suffixes
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

function hasSelections(selection?: NotebookSelection): boolean {
  if (!selection) {
    return false
  }
  return (
    Object.values(selection.sources).some((selected) => selected) ||
    Object.values(selection.notes).some((selected) => selected)
  )
}

interface GenerateSpeechScriptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerateSpeechScriptDialog({ open, onOpenChange }: GenerateSpeechScriptDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [expandedNotebooks, setExpandedNotebooks] = useState<string[]>([])
  const [selections, setSelections] = useState<Record<string, NotebookSelection>>({})
  const [speechScriptName, setSpeechScriptName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')

  const [isBuildingContext, setIsBuildingContext] = useState(false)
  const [tokenCount, setTokenCount] = useState<number>(0)
  const [charCount, setCharCount] = useState<number>(0)

  const notebooksQuery = useNotebooks()
  const generateSpeechScript = useGenerateSpeechScript()

  // Also fetch all sources directly (for legacy data structure support)
  const allSourcesQuery = useQuery({
    queryKey: ['all-sources'],
    queryFn: () => sourcesApi.list(),
    enabled: open,
  })

  const notebooks = useMemo(
    () => notebooksQuery.data ?? [],
    [notebooksQuery.data]
  )

  // Fetch sources and notes for notebooks using useQueries
  const sourcesQueries = useQueries({
    queries: notebooks.map((notebook) => ({
      queryKey: QUERY_KEYS.sources(notebook.id),
      queryFn: () => sourcesApi.list({ notebook_id: notebook.id }),
      enabled:
        open &&
        (expandedNotebooks.includes(notebook.id) || hasSelections(selections[notebook.id])),
    })),
  })

  const notesQueries = useQueries({
    queries: notebooks.map((notebook) => ({
      queryKey: QUERY_KEYS.notes(notebook.id),
      queryFn: () => notesApi.list({ notebook_id: notebook.id }),
      enabled:
        open &&
        (expandedNotebooks.includes(notebook.id) || hasSelections(selections[notebook.id])),
    })),
  })

  const sourcesByNotebook = useMemo<Record<string, SourceListResponse[]>>(() => {
    const map: Record<string, SourceListResponse[]> = {}
    notebooks.forEach((notebook, index) => {
      map[notebook.id] = sourcesQueries[index]?.data ?? []
    })
    return map
  }, [notebooks, sourcesQueries])

  const notesByNotebook = useMemo<Record<string, NoteResponse[]>>(() => {
    const map: Record<string, NoteResponse[]> = {}
    notebooks.forEach((notebook, index) => {
      map[notebook.id] = notesQueries[index]?.data ?? []
    })
    return map
  }, [notebooks, notesQueries])

  // Find PPT sources - try both new multi-notebook structure and legacy direct source query
  const pptSources = useMemo(() => {
    const allSources: SourceListResponse[] = []

    // First try the new multi-notebook structure
    Object.values(sourcesByNotebook).forEach((sources) => {
      sources.forEach((source) => {
        const filePath = source.asset?.file_path || ''
        const url = source.asset?.url || ''
        const title = source.title || ''

        const hasPptExtension = (text: string) => {
          const lowerText = text.toLowerCase()
          return lowerText.includes('.ppt') ||
                 lowerText.includes('.pptx') ||
                 lowerText.includes('.pdf')
        }

        const isPpt = hasPptExtension(filePath) || hasPptExtension(url) || hasPptExtension(title)

        console.log('PPT检测 (notebook关联):', {
          sourceId: source.id,
          title: source.title,
          filePath,
          url,
          isPpt,
          asset: source.asset,
        })

        if (isPpt) {
          allSources.push(source)
        }
      })
    })

    // If no PPT files found through notebook association, try direct source query
    // This handles the legacy data structure where sources aren't linked to notebooks
    if (allSources.length === 0 && allSourcesQuery.data) {
      console.log('未通过notebook关联找到PPT文件，尝试直接查询所有sources...')

      allSourcesQuery.data.forEach((source) => {
        const filePath = source.asset?.file_path || ''
        const url = source.asset?.url || ''
        const title = source.title || ''

        const hasPptExtension = (text: string) => {
          const lowerText = text.toLowerCase()
          return lowerText.includes('.ppt') ||
                 lowerText.includes('.pptx') ||
                 lowerText.includes('.pdf')
        }

        const isPpt = hasPptExtension(filePath) || hasPptExtension(url) || hasPptExtension(title)

        console.log('PPT检测 (直接查询):', {
          sourceId: source.id,
          title: source.title,
          filePath,
          url,
          isPpt,
          asset: source.asset,
        })

        if (isPpt) {
          allSources.push(source)
        }
      })
    }

    console.log('找到的PPT文件总数:', allSources.length)
    console.log('通过notebook关联的sources总数:', Object.values(sourcesByNotebook).reduce((sum, sources) => sum + sources.length, 0))
    console.log('直接查询的sources总数:', allSourcesQuery.data?.length || 0)

    return allSources
  }, [sourcesByNotebook, allSourcesQuery.data])

  // Initialise selection defaults when content loads
  useEffect(() => {
    if (!open) {
      return
    }

    setSelections((prev) => {
      let changed = false
      const next = { ...prev }

      notebooks.forEach((notebook, index) => {
        const sources = sourcesQueries[index]?.data
        const notes = notesQueries[index]?.data

        if (!sources && !notes) {
          return
        }

        if (!next[notebook.id]) {
          next[notebook.id] = { sources: {}, notes: {} }
          changed = true
        }

        if (sources) {
          const currentSources = next[notebook.id].sources
          sources.forEach((source) => {
            if (!(source.id in currentSources)) {
              currentSources[source.id] = false
              changed = true
            }
          })
        }

        if (notes) {
          const currentNotes = next[notebook.id].notes
          notes.forEach((note) => {
            if (!(note.id in currentNotes)) {
              currentNotes[note.id] = false
              changed = true
            }
          })
        }
      })

      return changed ? next : prev
    })
  }, [open, notebooks, sourcesQueries, notesQueries])

  const resetState = useCallback(() => {
    setExpandedNotebooks([])
    setSelections({})
    setSpeechScriptName('')
    setDescription('')
    setSelectedSourceId('')
    setTokenCount(0)
    setCharCount(0)
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  // Update token/char counts when selections change
  useEffect(() => {
    if (!open) {
      return
    }

    const updateContextCounts = async () => {
      // Check if there are any selections
      const hasAnySelections = Object.values(selections).some((selection) =>
        Object.values(selection.sources).some((selected) => selected) ||
        Object.values(selection.notes).some((selected) => selected)
      )

      if (!hasAnySelections) {
        setTokenCount(0)
        setCharCount(0)
        return
      }

      try {
        let totalTokens = 0
        let totalChars = 0

        // Build context for each notebook and sum up counts
        for (const [notebookId, selection] of Object.entries(selections)) {
          const sourcesConfig = Object.entries(selection.sources)
            .filter(([, selected]) => selected)
            .reduce<Record<string, string>>((acc, [sourceId]) => {
              acc[sourceId.replace(/^source:/, '')] = 'full content'
              return acc
            }, {})

          const notesConfig = Object.entries(selection.notes)
            .filter(([, selected]) => selected)
            .reduce<Record<string, string>>((acc, [noteId]) => {
              acc[noteId.replace(/^note:/, '')] = 'full content'
              return acc
            }, {})

          if (Object.keys(sourcesConfig).length === 0 && Object.keys(notesConfig).length === 0) {
            continue
          }

          const response = await chatApi.buildContext({
            notebook_id: notebookId,
            context_config: {
              sources: sourcesConfig,
              notes: notesConfig,
            },
          })

          totalTokens += response.token_count
          totalChars += response.char_count
        }

        setTokenCount(totalTokens)
        setCharCount(totalChars)
      } catch (error) {
        console.error('Error updating context counts:', error)
        // Don't reset counts on error, keep previous values
      }
    }

    updateContextCounts()
  }, [open, selections])

  const selectedNotebookSummaries = useMemo(() => {
    return notebooks.map((notebook) => {
      const selection = selections[notebook.id]
      if (!selection) {
        return { notebookId: notebook.id, sources: 0, notes: 0 }
      }
      const sourcesCount = Object.values(selection.sources).filter(Boolean).length
      const notesCount = Object.values(selection.notes).filter(Boolean).length
      return { notebookId: notebook.id, sources: sourcesCount, notes: notesCount }
    })
  }, [notebooks, selections])

  const handleNotebookToggle = useCallback(
    (notebookId: string, checked: boolean | 'indeterminate') => {
      const shouldCheck = checked === 'indeterminate' ? true : checked
      const sources = sourcesByNotebook[notebookId] ?? []
      const notes = notesByNotebook[notebookId] ?? []
      setSelections((prev) => {
        if (shouldCheck) {
          const nextSources: Record<string, boolean> = {}
          sources.forEach((source) => {
            nextSources[source.id] = true
          })
          const nextNotes: Record<string, boolean> = {}
          notes.forEach((note) => {
            nextNotes[note.id] = true
          })
          return {
            ...prev,
            [notebookId]: {
              sources: nextSources,
              notes: nextNotes,
            },
          }
        }

        const clearedSources: Record<string, boolean> = {}
        sources.forEach((source) => {
          clearedSources[source.id] = false
        })
        const clearedNotes: Record<string, boolean> = {}
        notes.forEach((note) => {
          clearedNotes[note.id] = false
        })

        return {
          ...prev,
          [notebookId]: {
            sources: clearedSources,
            notes: clearedNotes,
          },
        }
      })
    },
    [notesByNotebook, sourcesByNotebook]
  )

  const handleSourceToggle = useCallback(
    (notebookId: string, sourceId: string, checked: boolean) => {
      setSelections((prev) => ({
        ...prev,
        [notebookId]: {
          sources: {
            ...(prev[notebookId]?.sources ?? {}),
            [sourceId]: checked,
          },
          notes: prev[notebookId]?.notes ?? {},
        },
      }))
    },
    []
  )

  const handleNoteToggle = useCallback(
    (notebookId: string, noteId: string, checked: boolean) => {
      setSelections((prev) => ({
        ...prev,
        [notebookId]: {
          sources: prev[notebookId]?.sources ?? {},
          notes: {
            ...(prev[notebookId]?.notes ?? {}),
            [noteId]: checked,
          },
        },
      }))
    },
    []
  )

  const buildContentFromSelections = useCallback(async () => {
    const parts: string[] = []

    const tasks: Array<{ notebookId: string; payload: BuildContextRequest }> = []

    Object.entries(selections).forEach(([notebookId, selection]) => {
      const sourcesConfig = Object.entries(selection.sources)
        .filter(([, selected]) => selected)
        .reduce<Record<string, string>>((acc, [sourceId]) => {
          acc[sourceId.replace(/^source:/, '')] = 'full content'
          return acc
        }, {})

      const notesConfig = Object.entries(selection.notes)
        .filter(([, selected]) => selected)
        .reduce<Record<string, string>>((acc, [noteId]) => {
          acc[noteId.replace(/^note:/, '')] = 'full content'
          return acc
        }, {})

      if (Object.keys(sourcesConfig).length === 0 && Object.keys(notesConfig).length === 0) {
        return
      }

      tasks.push({
        notebookId,
        payload: {
          notebook_id: notebookId,
          context_config: {
            sources: sourcesConfig,
            notes: notesConfig,
          },
        },
      })
    })

    if (tasks.length === 0) {
      return ''
    }

    for (const task of tasks) {
      try {
        const response = await chatApi.buildContext(task.payload)
        const notebookName = notebooks.find((nb) => nb.id === task.notebookId)?.name ?? task.notebookId
        const contextString = JSON.stringify(response.context, null, 2)
        const snippet = `Notebook: ${notebookName}\n${contextString}`
        parts.push(snippet)
      } catch (error) {
        console.error('Failed to build context for notebook', task.notebookId, error)
        throw new Error('Failed to build context. Please review your selections.')
      }
    }

    return parts.join('\n\n')
  }, [notebooks, selections])

  const handleSubmit = useCallback(async () => {
    if (!selectedSourceId) {
      toast({
        title: '请选择PPT文件',
        description: '必须选择一个PPT格式的文件作为基准文件。',
        variant: 'destructive',
      })
      return
    }

    if (!speechScriptName.trim()) {
      toast({
        title: '演讲稿名称不能为空',
        description: '请提供演讲稿的名称。',
        variant: 'destructive',
      })
      return
    }

    setIsBuildingContext(true)
    try {
      // 构建辅助内容（可选）
      const auxiliaryContent = await buildContentFromSelections()

      // 准备辅助sources和notebooks列表
      const auxiliarySources: string[] = []
      const auxiliaryNotebooks: string[] = []

      Object.entries(selections).forEach(([notebookId, selection]) => {
        Object.entries(selection.sources).forEach(([sourceId, selected]) => {
          if (selected && sourceId !== selectedSourceId) {
            auxiliarySources.push(sourceId)
          }
        })
        Object.entries(selection.notes).forEach(([noteId, selected]) => {
          if (selected) {
            auxiliaryNotebooks.push(noteId)
          }
        })
      })

      await generateSpeechScript.mutateAsync({
        name: speechScriptName.trim(),
        description: description.trim() || undefined,
        source_id: selectedSourceId,
        auxiliary_sources: auxiliarySources,
        auxiliary_notebooks: auxiliaryNotebooks,
      })

      // Delay closing dialog slightly to ensure refetch completes
      setTimeout(() => {
        onOpenChange(false)
        resetState()
      }, 500)
    } catch (error) {
      console.error('Failed to generate speech script', error)
      toast({
        title: '演讲稿生成失败',
        description: error instanceof Error ? error.message : '请稍后重试。',
        variant: 'destructive',
      })
    } finally {
      setIsBuildingContext(false)
    }
  }, [
    buildContentFromSelections,
    description,
    generateSpeechScript,
    onOpenChange,
    resetState,
    selectedSourceId,
    selections,
    speechScriptName,
    toast,
  ])

  const isSubmitting = generateSpeechScript.isPending || isBuildingContext

  return (
    <Dialog open={open} onOpenChange={(value) => {
      onOpenChange(value)
      if (!value) {
        resetState()
      }
    }}>
      <DialogContent className="w-[80vw] max-w-[1080px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>生成演讲稿</DialogTitle>
          <DialogDescription>
            选择PPT文件作为基准，配置辅助内容，生成结构化的演讲稿。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_1fr]">
          <div className="flex flex-col gap-4">
            {/* PPT文件选择 */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  基准文件
                </h3>
                <p className="text-xs text-muted-foreground">
                  选择PPT格式的文件作为演讲稿生成的基准。
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <Label htmlFor="source_select" className="text-sm font-medium">
                  选择PPT文件
                </Label>
                <select
                  id="source_select"
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">请选择PPT文件...</option>
                  {pptSources.map((source) => {
                    // Get the best filename representation
                    const filePath = source.asset?.file_path
                    const url = source.asset?.url
                    const title = source.title

                    // Extract filename from path or URL
                    const getFileName = (path: string) => {
                      if (!path) return ''
                      // Get the last part after '/' or '\'
                      const parts = path.split(/[/\\]/)
                      return parts[parts.length - 1]
                    }

                    const fileName = getFileName(filePath || url || '')
                    const displayName = title || fileName || '未命名文件'

                    return (
                      <option key={source.id} value={source.id}>
                        {displayName} {fileName && fileName !== displayName ? `(${fileName})` : ''}
                      </option>
                    )
                  })}
                </select>
                {pptSources.length === 0 && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>没有找到PPT文件。请先上传PPT格式的文件到sources中。</p>
                    <p>支持的文件格式：.ppt, .pptx, .pdf</p>
                    <p>
                      通过notebook关联的sources总数：
                      {Object.values(sourcesByNotebook).reduce((sum, sources) => sum + sources.length, 0)}
                    </p>
                    <p>
                      直接查询的sources总数：
                      {allSourcesQuery.data?.length || 0}
                      {allSourcesQuery.isLoading ? ' (加载中...)' : ''}
                    </p>
                    {allSourcesQuery.data && allSourcesQuery.data.length > 0 && (
                      <p className="text-orange-600">
                        如果有PPT文件但仍未显示，请检查浏览器控制台的&ldquo;PPT检测&rdquo;日志获取详细信息。
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 演讲稿设置 */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  演讲稿设置
                </h3>
              </div>

              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="script_name">演讲稿名称</Label>
                  <Input
                    id="script_name"
                    value={speechScriptName}
                    onChange={(event) => setSpeechScriptName(event.target.value)}
                    placeholder="例如：产品发布会演讲稿"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="script_description">描述（可选）</Label>
                  <Textarea
                    id="script_description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="演讲稿的简要描述..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 辅助内容 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    辅助内容
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    可选择额外的sources和notes来辅助生成大纲和讲稿。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedNotebookSummaries.reduce(
                      (acc, summary) => acc + summary.sources + summary.notes,
                      0
                    )}{' '}
                    项已选择
                  </Badge>
                  {(tokenCount > 0 || charCount > 0) && (
                    <span className="text-xs text-muted-foreground">
                      {tokenCount > 0 && `${formatNumber(tokenCount)} tokens`}
                      {tokenCount > 0 && charCount > 0 && ' / '}
                      {charCount > 0 && `${formatNumber(charCount)} chars`}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30">
                {notebooksQuery.isLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在加载notebooks
                  </div>
                ) : notebooks.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    没有找到notebooks。先创建一个notebook并添加内容。
                  </div>
                ) : (
                  <ScrollArea className="h-[40vh]">
                    <Accordion
                      type="multiple"
                      value={expandedNotebooks}
                      onValueChange={(value) => setExpandedNotebooks(value as string[])}
                      className="w-full"
                    >
                      {notebooks.map((notebook, index) => {
                        const sources = sourcesByNotebook[notebook.id] ?? []
                        const notes = notesByNotebook[notebook.id] ?? []
                        const selection = selections[notebook.id]
                        const summary = selectedNotebookSummaries[index]
                        const notebookChecked = summary.sources + summary.notes > 0
                        const totalItems = sources.length + notes.length
                        const isIndeterminate =
                          notebookChecked &&
                          summary.sources + summary.notes > 0 &&
                          summary.sources + summary.notes < totalItems

                        return (
                          <AccordionItem key={notebook.id} value={notebook.id}>
                            <div className="flex items-start gap-3 px-4 pt-3">
                              <Checkbox
                                checked={isIndeterminate ? 'indeterminate' : notebookChecked}
                                onCheckedChange={(checked) => {
                                  handleNotebookToggle(notebook.id, checked)
                                  queryClient.prefetchQuery({
                                    queryKey: QUERY_KEYS.sources(notebook.id),
                                    queryFn: () => sourcesApi.list({ notebook_id: notebook.id }),
                                  })
                                  queryClient.prefetchQuery({
                                    queryKey: QUERY_KEYS.notes(notebook.id),
                                    queryFn: () => notesApi.list({ notebook_id: notebook.id }),
                                  })
                                }}
                                onClick={(event) => event.stopPropagation()}
                              />
                              <AccordionTrigger className="flex-1 px-0 py-0 hover:no-underline">
                                <div className="flex w-full items-center justify-between gap-3">
                                  <div className="text-left">
                                    <p className="font-medium text-sm text-foreground">
                                      {notebook.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {summary.sources + summary.notes > 0
                                        ? `${summary.sources} sources, ${summary.notes} notes`
                                        : '未选择内容'}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {sources.length} sources · {notes.length} notes
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                            </div>
                            <AccordionContent>
                              <div className="space-y-4 px-4 pb-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Sources
                                    </h4>
                                    {sourcesQueries[index]?.isFetching && (
                                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                  {sources.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      此notebook中没有sources。
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {sources.map((source) => {
                                        const isSelected = selection?.sources?.[source.id] ?? false
                                        return (
                                          <div
                                            key={source.id}
                                            className="flex items-center gap-3 rounded border bg-background px-3 py-2"
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={(checked) =>
                                                handleSourceToggle(
                                                  notebook.id,
                                                  source.id,
                                                  Boolean(checked)
                                                )
                                              }
                                            />
                                            <div className="flex flex-1 flex-col gap-1">
                                              <span className="text-sm font-medium text-foreground">
                                                {source.title || '未命名source'}
                                              </span>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{source.asset?.url ? '链接' : '文件'}</span>
                                                <span>•</span>
                                                <span>{source.embedded ? '已嵌入' : '未嵌入'}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Notes
                                  </h4>
                                  {notes.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      此notebook中没有notes。
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {notes.map((note) => {
                                        const isSelected = selection?.notes?.[note.id] ?? false
                                        return (
                                          <div
                                            key={note.id}
                                            className="flex items-center gap-3 rounded border bg-background px-3 py-2"
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={(checked) =>
                                                handleNoteToggle(
                                                  notebook.id,
                                                  note.id,
                                                  Boolean(checked)
                                                )
                                              }
                                            />
                                            <div className="flex flex-1 flex-col">
                                              <span className="text-sm font-medium text-foreground">
                                                {note.title || '未命名note'}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                更新于 {new Date(note.updated).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedSourceId || !speechScriptName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...
                  </>
                ) : (
                  '生成演讲稿'
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                生成完成后，演讲稿将出现在列表中。刷新列表查看进度。
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
