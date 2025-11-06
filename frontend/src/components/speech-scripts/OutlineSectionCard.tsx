'use client'

import { useState } from 'react'
import { Eye, EyeOff, Image as ImageIcon, Edit3, Save, X } from 'lucide-react'

import { useUpdateOutlineSection } from '@/lib/hooks/use-speech-scripts'
import { speechScriptsApi } from '@/lib/api/speech-scripts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { OutlineSectionResponse } from '@/lib/types/speech-scripts'

interface OutlineSectionCardProps {
  section: OutlineSectionResponse
  speechScriptId: string
  index: number
}

export function OutlineSectionCard({ section, speechScriptId, index }: OutlineSectionCardProps) {
  const [showOutline, setShowOutline] = useState(true)
  const [showScript, setShowScript] = useState(true)
  const [showImage, setShowImage] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editOutline, setEditOutline] = useState('')
  const [editScript, setEditScript] = useState('')

  const updateOutlineSection = useUpdateOutlineSection()

  const handleToggleImage = async () => {
    if (showImage && imageUrl) {
      setShowImage(false)
      return
    }

    if (!section.image_path) {
      return
    }

    setLoadingImage(true)
    try {
      const blob = await speechScriptsApi.getOutlineSectionImage(speechScriptId, section.id)
      const url = URL.createObjectURL(blob)
      setImageUrl(url)
      setShowImage(true)
    } catch (error) {
      console.error('Failed to load image:', error)
    } finally {
      setLoadingImage(false)
    }
  }

  const handleEdit = () => {
    setEditTitle(section.title)
    setEditOutline(section.outline)
    setEditScript(section.script)
    setIsEditing(true)
  }

  const handleSave = () => {
    const updateData: { title?: string; outline?: string; script?: string } = {}

    if (editTitle !== section.title) {
      updateData.title = editTitle
    }
    if (editOutline !== section.outline) {
      updateData.outline = editOutline
    }
    if (editScript !== section.script) {
      updateData.script = editScript
    }

    if (Object.keys(updateData).length > 0) {
      updateOutlineSection.mutate(
        { speechScriptId, sectionId: section.id, updateData },
        {
          onSuccess: () => {
            setIsEditing(false)
          },
        }
      )
    } else {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditTitle('')
    setEditOutline('')
    setEditScript('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                第{index}页 (PPT {section.page_number})
              </Badge>
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-base font-medium flex-1 min-w-0"
                  placeholder="大纲标题"
                />
              ) : (
                <CardTitle className="text-base">{section.title}</CardTitle>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={updateOutlineSection.isPending}
                >
                  {updateOutlineSection.isPending ? (
                    '保存中...'
                  ) : (
                    <>
                      <Save className="mr-1 h-3 w-3" />
                      保存
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="mr-1 h-3 w-3" />
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                >
                  <Edit3 className="mr-1 h-3 w-3" />
                  编辑
                </Button>
                {section.image_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleImage}
                    disabled={loadingImage}
                  >
                    {loadingImage ? (
                      '加载中...'
                    ) : showImage ? (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" />
                        隐藏图片
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-1 h-3 w-3" />
                        显示图片
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* PPT页面图片 */}
        {showImage && imageUrl && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <img
              src={imageUrl}
              alt={`第${section.page_number}页`}
              className="w-full max-h-96 object-contain rounded"
            />
          </div>
        )}

        {/* 大纲部分 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              大纲
            </h4>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOutline(!showOutline)}
              >
                {showOutline ? (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" />
                    隐藏
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    显示
                  </>
                )}
              </Button>
            )}
          </div>

          {(showOutline || isEditing) && (
            <div className="rounded-lg border bg-muted/30 p-4">
              {isEditing ? (
                <Textarea
                  value={editOutline}
                  onChange={(e) => setEditOutline(e.target.value)}
                  className="text-sm min-h-[80px] resize-none"
                  placeholder="请输入大纲内容"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{section.outline}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* 讲稿部分 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              讲稿
            </h4>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScript(!showScript)}
              >
                {showScript ? (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" />
                    隐藏
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    显示
                  </>
                )}
              </Button>
            )}
          </div>

          {(showScript || isEditing) && (
            <div className="rounded-lg border bg-muted/30 p-4">
              {isEditing ? (
                <Textarea
                  value={editScript}
                  onChange={(e) => setEditScript(e.target.value)}
                  className="text-sm min-h-[120px] resize-none"
                  placeholder="请输入讲稿内容"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{section.script}</p>
              )}
            </div>
          )}
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span>排序: {section.order_index}</span>
          {section.created && (
            <span>
              创建于 {new Date(section.created).toLocaleString('zh-CN')}
            </span>
          )}
          {section.updated && section.updated !== section.created && (
            <span>
              更新于 {new Date(section.updated).toLocaleString('zh-CN')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
