import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from '../../../public/locales/en/translation.json'
import zhTranslation from '../../../public/locales/zh/translation.json'

// 只在客户端初始化一次
if (typeof window !== 'undefined' && !i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: {
          translation: enTranslation,
        },
        zh: {
          translation: zhTranslation,
        },
      },
      lng: typeof window !== 'undefined' ? localStorage.getItem('locale') || 'en' : 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    })
    .then(() => {
      // 初始化完成
    })
    .catch(() => {
      // 初始化失败，使用默认配置
    })
}

export default i18n

