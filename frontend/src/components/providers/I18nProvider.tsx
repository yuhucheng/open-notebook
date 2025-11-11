'use client'

import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n/client'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // 在客户端，如果 i18n 已经初始化，立即设置为 ready
  // 这样可以避免首次渲染时返回 null 导致的 hydration 不匹配
  const [isReady, setIsReady] = useState(() => {
    if (typeof window !== 'undefined') {
      return i18n.isInitialized
    }
    return false
  })

  useEffect(() => {
    // 确保 i18n 已经初始化
    if (i18n.isInitialized) {
      setIsReady(true)
    } else {
      i18n.on('initialized', () => {
        setIsReady(true)
      })
    }
  }, [])

  // 如果还没准备好，返回 children 而不是 null，避免 hydration 不匹配
  // i18n 会在后台初始化，即使还没初始化完成，也不会导致应用崩溃
  if (!isReady) {
    return <>{children}</>
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

