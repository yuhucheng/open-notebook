'use client'

import { useState, useEffect, useRef } from 'react'
import { MeetingPodcastEpisode } from '@/lib/types/meetings'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MeetingPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodes: MeetingPodcastEpisode[]
  meetingTheme: string
  meetingCode: string
}

export function MeetingPreviewDialog({
  open,
  onOpenChange,
  episodes,
  meetingTheme,
  meetingCode,
}: MeetingPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // 当弹窗打开时，重置到第一项
  useEffect(() => {
    if (open) {
      setCurrentIndex(0)
      // 重置音频播放
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.pause()
      }
    } else {
      // 弹窗关闭时停止播放
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [open])

  // 处理音频加载完成，自动播放
  const handleAudioCanPlay = () => {
    if (open && audioRef.current && episodes[currentIndex]) {
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // 自动播放可能被浏览器阻止，这是正常的
          console.log('自动播放被阻止，用户需要手动点击播放:', error)
        })
      }
    }
  }

  // 当索引变化时，重新加载音频
  useEffect(() => {
    if (audioRef.current && episodes[currentIndex]) {
      audioRef.current.load()
    }
  }, [currentIndex, episodes])

  // 处理音频播放结束，自动切换到下一项
  const handleAudioEnded = () => {
    if (currentIndex < episodes.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // 播放完毕
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }

  const currentEpisode = episodes[currentIndex]

  if (!episodes.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(90vw,720px)] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>视频会议预览</DialogTitle>
            <DialogDescription>
              {meetingTheme} - {meetingCode}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">暂无预览内容</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(90vw,720px)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>视频会议预览</DialogTitle>
          <DialogDescription>
            {meetingTheme} - {meetingCode}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* 图片展示区域 */}
          <div className="flex-1 flex items-center justify-center bg-muted rounded-lg overflow-hidden min-h-[300px]">
            {currentEpisode?.ppt_image_url ? (
              <img
                src={currentEpisode.ppt_image_url}
                alt={currentEpisode.title || `第 ${currentEpisode.page_number} 页`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">暂无图片</p>
              </div>
            )}
          </div>

          {/* 音频播放区域 */}
          <div className="space-y-2">
            {currentEpisode && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {currentEpisode.title || `第 ${currentEpisode.page_number} 页`}
                    </p>
                  </div>
                  <div className="ml-4 text-xs text-muted-foreground whitespace-nowrap">
                    {currentIndex + 1} / {episodes.length}
                  </div>
                </div>
                <audio
                  key={currentIndex}
                  ref={audioRef}
                  controls
                  className="w-full"
                  onEnded={handleAudioEnded}
                  onCanPlay={handleAudioCanPlay}
                  preload="auto"
                >
                  <source src={currentEpisode.clip_url} type="audio/mpeg" />
                  您的浏览器不支持音频播放。
                </audio>
              </>
            )}
          </div>

          {/* 演讲稿显示区域 */}
          {currentEpisode?.script && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium text-foreground">演讲稿</h3>
              <div className="bg-muted rounded-lg p-4 max-h-[200px] overflow-y-auto">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {currentEpisode.script}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

