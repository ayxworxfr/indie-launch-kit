import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// 内容页集合（隐私政策、用户协议等 Markdown 文件）
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(99),
  }),
})

export const collections = { pages }
