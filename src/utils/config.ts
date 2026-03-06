import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

// ─── 类型定义 ───────────────────────────────────────────────────────────────

export interface LocalizedString {
  zh: string
  en: string
}

export interface Feature {
  icon: string
  title: LocalizedString
  description: LocalizedString
}

export interface Screenshot {
  src: string
  alt: LocalizedString
}

export interface FooterLink {
  label: LocalizedString
  url: string
}

export interface AppConfig {
  // 站点的完整域名，用于生成 canonical URL 和 og:url
  // 例：https://your-app.com（结尾不加斜杠）
  site_url: string
  app: {
    name: string
    tagline: LocalizedString
    description: LocalizedString
    icon: string
    logo: string
  }
  theme: {
    primary: string
    secondary: string
  }
  download: {
    ios_url: string
    android_url: string
    apk_url: string
    qrcode: string
  }
  features: Feature[]
  screenshots: Screenshot[]
  announcement: {
    enabled: boolean
    content: LocalizedString
  }
  seo: {
    og_image: string
    twitter_handle: string
  }
  footer: {
    copyright: string
    contact_email: string
    links: FooterLink[]
  }
  default_locale: string
}

// ─── 默认值合并 ──────────────────────────────────────────────────────────────

function mergeWithDefaults(raw: Record<string, unknown>): AppConfig {
  const app = (raw.app as Record<string, unknown>) || {}
  const theme = (raw.theme as Record<string, unknown>) || {}
  const download = (raw.download as Record<string, unknown>) || {}
  const announcement = (raw.announcement as Record<string, unknown>) || {}
  const seo = (raw.seo as Record<string, unknown>) || {}
  const footer = (raw.footer as Record<string, unknown>) || {}

  return {
    site_url: (raw.site_url as string) || '',
    app: {
      name: (app.name as string) || '我的 App',
      tagline: (app.tagline as LocalizedString) || {
        zh: '一句话描述你的 App',
        en: 'Your app tagline here',
      },
      description: (app.description as LocalizedString) || {
        zh: '应用描述',
        en: 'App description',
      },
      icon: (app.icon as string) || '/images/icon.png',
      logo: (app.logo as string) || '/images/logo.png',
    },
    theme: {
      primary: (theme.primary as string) || '#667eea',
      secondary: (theme.secondary as string) || '#764ba2',
    },
    download: {
      ios_url: (download.ios_url as string) || '',
      android_url: (download.android_url as string) || '',
      apk_url: (download.apk_url as string) || '',
      qrcode: (download.qrcode as string) || '',
    },
    features: (raw.features as Feature[]) || [],
    screenshots: (raw.screenshots as Screenshot[]) || [],
    announcement: {
      enabled: (announcement.enabled as boolean) || false,
      content: (announcement.content as LocalizedString) || { zh: '', en: '' },
    },
    seo: {
      og_image: (seo.og_image as string) || '/images/og-image.png',
      twitter_handle: (seo.twitter_handle as string) || '',
    },
    footer: {
      copyright: (footer.copyright as string) || '我的 App',
      contact_email: (footer.contact_email as string) || '',
      links: (footer.links as FooterLink[]) || [],
    },
    default_locale: (raw.default_locale as string) || 'zh',
  }
}

// ─── 读取配置（带缓存，构建期只读一次） ──────────────────────────────────────

let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (_config) return _config
  const filePath = join(process.cwd(), 'app.config.yaml')
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = yaml.load(raw) as Record<string, unknown>
  _config = mergeWithDefaults(parsed)
  return _config
}
