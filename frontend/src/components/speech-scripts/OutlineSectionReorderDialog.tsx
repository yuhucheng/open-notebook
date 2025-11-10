'use client'

import { useState } from 'react'
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OutlineSectionResponse } from '@/lib/types/speech-scripts'

interface OutlineSectionReorderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outlineSections: OutlineSectionResponse[]
  onReorder: (newOrder: Array<{ id: string; order_index: number }>) => void
}

export function OutlineSectionReorderDialog({
  open,
  onOpenChange,
  outlineSections,
  onReorder,
}: OutlineSectionReorderDialogProps) {
  const [sections, setSections] = useState<OutlineSectionResponse[]>(() =>
    [...outlineSections].sort((a, b) => a.order_index - b.order_index)
  )

  const handleMoveUp = (index: number) => {
    if (index === 0) return

    const newSections = [...sections]
    const temp = newSections[index]
    newSections[index] = newSections[index - 1]
    newSections[index - 1] = temp

    setSections(newSections)
  }

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return

    const newSections = [...sections]
    const temp = newSections[index]
    newSections[index] = newSections[index + 1]
    newSections[index + 1] = temp

    setSections(newSections)
  }

  const handleSave = () => {
    const newOrder = sections.map((section, index) => ({
      id: section.id,
      order_index: index,
    }))

    onReorder(newOrder)
  }

  const handleCancel = () => {
    // 重置为原始顺序
    setSections([...outlineSections].sort((a, b) => a.order_index - b.order_index))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>重新排序大纲讲稿</DialogTitle>
          <DialogDescription>
            拖拽或使用按钮重新排列演讲稿的顺序。保存后将更新所有讲稿的排序索引。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground w-8">
                  {index + 1}
                </span>
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    第{index + 1}页 (PPT {section.page_number})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {section.title}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sections.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存排序
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

