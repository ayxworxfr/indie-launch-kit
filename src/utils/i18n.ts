import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import type { LocalizedString } from './config'

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export type Locale = 'zh' | 'en'

type Messages = Record<string, unknown>

// ─── 消息加载（带缓存） ──────────────────────────────────────────────────────────

const cache: Partial<Record<Locale, Messages>> = {}

function loadMessages(locale: Locale): Messages {
  if (cache[locale]) return cache[locale]!
  const filePath = join(process.cwd(), 'src', 'locales', `${locale}.yaml`)
  const raw = readFileSync(filePath, 'utf-8')
  cache[locale] = yaml.load(raw) as Messages
  return cache[locale]!
}

// ─── 翻译函数工厂 ──────────────────────────────────────────────────────────────

/**
 * 根据 locale 返回一个翻译函数 t，支持点分隔路径
 * 例：t('nav.home') → "首页"
 */
export function useTranslations(locale: Locale) {
  const messages = loadMessages(locale)

  return function t(key: string): string {
    const parts = key.split('.')
    let current: unknown = messages
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return key
      current = (current as Record<string, unknown>)[part]
    }
    return typeof current === 'string' ? current : key
  }
}

// ─── 多语言字段取值 ─────────────────────────────────────────────────────────────

/**
 * 从 LocalizedString 中取当前语言的值，回退到中文
 * 例：lv({ zh: '首页', en: 'Home' }, 'en') → 'Home'
 */
export function lv(field: LocalizedString | string, locale: Locale): string {
  if (typeof field === 'string') return field
  return (field as Record<string, string>)[locale] || field.zh || ''
}
