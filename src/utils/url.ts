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
