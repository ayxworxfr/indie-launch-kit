import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'

// 从配置文件读取 site_url，让 Astro 知道站点域名
// 用于 sitemap 等需要绝对路径的功能
function getSiteUrl() {
  try {
    const raw = readFileSync('./app.config.yaml', 'utf-8')
    const config = yaml.load(raw)
    return config?.site_url || undefined
  } catch {
    return undefined
  }
}

export default defineConfig({
  site: getSiteUrl(),
  base: process.env.BASE_PATH || '/',
  output: 'static',
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
    routing: {
      prefixDefaultLocale: true,
    },
  },
})
