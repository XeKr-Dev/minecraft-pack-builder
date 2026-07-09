import {createI18n} from 'vue-i18n'
import zhCN from '@/lang/zh-CN.json'
import enUS from '@/lang/en-US.json'

export type Locale = 'zh-CN' | 'en-US'

const STORAGE_KEY = 'locale'

function getDefaultLocale(): Locale {
    const savedLocale = localStorage.getItem(STORAGE_KEY)
    if (savedLocale === 'zh-CN' || savedLocale === 'en-US') {
        return savedLocale
    }
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export const i18n = createI18n({
    legacy: false,
    locale: getDefaultLocale(),
    fallbackLocale: 'zh-CN',
    messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
    }
})

export function setLocale(locale: Locale) {
    i18n.global.locale.value = locale
    localStorage.setItem(STORAGE_KEY, locale)
}

export function t(key: string, named?: Record<string, unknown>) {
    return i18n.global.t(key, named ?? {})
}
