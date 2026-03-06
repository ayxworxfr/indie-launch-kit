/**
 * 生成带有 Astro base 路径前缀的本地化 URL
 *
 * 部署到子路径（如 GitHub Pages /indie-launch-kit/）时，
 * import.meta.env.BASE_URL 返回 '/indie-launch-kit/'，
 * 所有内部链接都必须通过此函数生成，否则会丢失 base 前缀。
 *
 * @param lang  语言代码，如 'zh' | 'en'
 * @param slug  页面 slug，如 'terms'、'privacy'。不传则返回首页路径
 */
export function localePath(lang: string, slug?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (slug) {
    return `${base}/${lang}/${slug}`
  }
  return `${base}/${lang}/`
}

/**
 * 生成带有 Astro base 路径前缀的静态资源路径
 *
 * app.config.yaml 中配置的图片路径（如 /images/favicon.png）是相对于站点根目录的，
 * 部署到子路径时必须加上 base 前缀，否则会 404。
 *
 * @param path  以 / 开头的资源路径，如 '/images/favicon.png'
 */
export function assetPath(path: string): string {
  if (!path) return path
  // 已经是完整 URL（http/https）则直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path}`
}
