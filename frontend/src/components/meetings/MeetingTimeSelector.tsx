'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// 生成未来30天的日期选项
function generateDateOptions(): Array<{ value: string; label: string }> {
  const options = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const value = `${year}-${month}-${day}`
    
    let label = `${year}年${month}月${day}日`
    if (i === 0) label += ' (今天)'
    else if (i === 1) label += ' (明天)'
    
    options.push({ value, label })
  }
  
  return options
}

// 生成时间选项（15分钟间隔）
function generateTimeOptions(): Array<{ value: string; label: string }> {
  const options = []
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = String(hour).padStart(2, '0')
      const minuteStr = String(minute).padStart(2, '0')
      const value = `${hourStr}:${minuteStr}`
      options.push({ value, label: value })
    }
  }
  
  return options
}

export interface MeetingTimeSelectorProps {
  label: string
  date: string
  time: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  disabled?: boolean
  description?: string
  type?: 'start' | 'end'
  startDate?: string
  startTime?: string
}

export function MeetingTimeSelector({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  disabled = false,
  description,
  type,
  startDate,
  startTime,
}: MeetingTimeSelectorProps) {
  // 过滤时间选项
  const filteredTimeOptions = (() => {
    const allOptions = generateTimeOptions()
    
    // 如果是开始时间，且选择的是今天，过滤掉已经过去的时间
    if (type === 'start') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDate = new Date(date)
      selectedDate.setHours(0, 0, 0, 0)
      
      // 如果选择的是今天
      if (selectedDate.getTime() === today.getTime()) {
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        
        return allOptions.filter((option) => {
          const [hour, minute] = option.value.split(':').map(Number)
          return hour > currentHour || (hour === currentHour && minute > currentMinute)
        })
      }
    }
    
    // 如果是结束时间，且与开始时间是同一天，过滤掉比开始时间早的时间
    if (type === 'end' && startDate && startTime && date === startDate) {
      const [startHour, startMinute] = startTime.split(':').map(Number)
      
      return allOptions.filter((option) => {
        const [hour, minute] = option.value.split(':').map(Number)
        return hour > startHour || (hour === startHour && minute > startMinute)
      })
    }
    
    return allOptions
  })()

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 grid-cols-2">
        <div className="space-y-2">
          <Select
            value={date}
            onValueChange={onDateChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择日期" />
            </SelectTrigger>
            <SelectContent>
              {generateDateOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Select
            value={time}
            onValueChange={onTimeChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择时间" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {filteredTimeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

