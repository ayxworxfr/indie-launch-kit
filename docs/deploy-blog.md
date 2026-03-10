# 用 indie-launch-kit 给独立 App 搭推广页：踩坑全记录

> 把一个 Astro 静态站同时部署到 GitHub Pages 和 Cloudflare Pages，中间踩了不少坑。记录下来，希望省去后来者的时间。

## 背景

最近用 [indie-launch-kit](https://github.com/ayxworxfr/indie-launch-kit) 给自己的 Android App **乐理通** 搭了一个推广落地页。这个模板基于 Astro 5 + Tailwind CSS，改一个 YAML 文件就能上线，理念很好。

但实际部署时踩了一堆坑，主要集中在**多平台部署的路径冲突**和**大文件限制**两个问题上。

---

## 坑一：GitHub Pages 子路径导致资源全 404

GitHub Pages 把项目部署在 `username.github.io/repo-name/` 这样的子路径下，而不是根域名。Astro 默认生成的资源路径是 `/_astro/xxx.css`，到了 GitHub Pages 上就变成了 404。

**解决方案：** 在 `astro.config.mjs` 里配置 `base`：

```javascript
export default defineConfig({
  base: process.env.BASE_PATH || '/',
})
```

然后在 GitHub Actions 构建时传入环境变量：

```yaml
- name: 构建静态文件
  run: npm run build
  env:
    BASE_PATH: /indie-launch-kit
```

同时，所有内部链接和静态资源引用都要用 `import.meta.env.BASE_URL` 做前缀，为此封装了两个工具函数：

```typescript
// src/utils/url.ts

// 生成带 base 前缀的本地化路由
export function localePath(lang: string, slug?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return slug ? `${base}/${lang}/${slug}` : `${base}/${lang}/`
}

// 生成带 base 前缀的静态资源路径
export function assetPath(path: string): string {
  if (!path || path.startsWith('http')) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path}`
}
```

然后在所有组件里把硬编码路径替换掉：

```astro
<!-- 之前 -->
<a href="/zh/">首页</a>
<img src="/images/icon.png" />

<!-- 之后 -->
<a href={localePath('zh')}>首页</a>
<img src={assetPath('/images/icon.png')} />
```

---

## 坑二：GitHub Pages 和 Cloudflare 不能共用同一份构建产物

修好 GitHub Pages 后，把同一份产物部署到 Cloudflare Pages，样式全没了。

原因很简单：

| 部署目标 | 访问路径 | 需要的 BASE_PATH |
|---|---|---|
| GitHub Pages | `username.github.io/indie-launch-kit/` | `/indie-launch-kit` |
| Cloudflare Pages | `musiclab.pages.dev/` | 不设（默认 `/`） |

用带 `/indie-launch-kit` 前缀构建出来的产物，CSS/JS 路径全是 `/indie-launch-kit/_astro/xxx.css`，Cloudflare 上当然找不到。

**错误做法：** 让 `deploy-cloudflare` job 复用 `build` job 的产物。

**正确做法：** Cloudflare 部署独立构建，不传 `BASE_PATH`：

```yaml
# GitHub Pages 构建（带 BASE_PATH）
build:
  steps:
    - run: npm run build
      env:
        BASE_PATH: /indie-launch-kit
    - uses: actions/upload-artifact@v4   # 上传产物供 GitHub Pages 使用

# Cloudflare 独立构建（不带 BASE_PATH）
deploy-cloudflare:
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run build                  # 不设 BASE_PATH
    - run: rm -f dist/*.apk
    - uses: cloudflare/wrangler-action@v3
      with:
        command: pages deploy dist/ --project-name=musiclab --branch=musiclab --commit-dirty=true
```

两个 job 各自构建，互不干扰。

---

## 坑三：APK 超过 Cloudflare 25MB 文件限制

App 的 APK 有 94.7MB，Cloudflare Pages 单文件上限 25MB，直接报错：

```
✘ [ERROR] Pages only supports files up to 25 MiB in size
musiclab.apk is 94.7 MiB in size
```

而 GitHub Pages 单文件上限是 100MB，可以正常托管 APK。

**解决方案：** 在 Cloudflare 部署前删掉 APK，GitHub Pages 那边保留。APK 下载链接改为 GitHub Pages 的直链：

```yaml
deploy-cloudflare:
  steps:
    - run: npm run build
    - run: rm -f dist/*.apk       # 删掉大文件，只对 Cloudflare 生效
    - uses: cloudflare/wrangler-action@v3
      ...
```

`app.config.yaml` 里的下载链接指向 GitHub Pages：

```yaml
download:
  apk_url: 'https://ayxworxfr.github.io/indie-launch-kit/musiclab.apk'
```

这样 Cloudflare 负责展示，GitHub Pages 负责提供 APK 下载，各司其职。

---

## 坑四：Cloudflare 部署 URL 带随机 hash 前缀

部署成功后访问 URL 变成了 `https://e3747905.musiclab.pages.dev/zh/`，前面多了一串 hash。

原因：wrangler 默认创建的是**预览部署（Preview Deployment）**，只有**生产部署（Production Deployment）**才会使用 `project.pages.dev` 的干净域名。

**解决方案：** 在 wrangler 命令里加 `--branch` 参数，值与 Cloudflare 项目里配置的生产分支一致：

```yaml
command: pages deploy dist/ --project-name=musiclab --branch=musiclab --commit-dirty=true
```

同时在 Cloudflare Dashboard → `musiclab` 项目 → Settings → Builds & Deployments → Production branch 里确认填的是 `musiclab`。

---

## 坑五：Cloudflare API Token 权限配置

第一次配 Token 时一直报 `403 Authentication error`，原因是权限选错了。

正确权限路径：

```
Account → Cloudflare Pages → Edit
```

不是 Zone 级别的权限，是 Account 级别。

---

## 最终架构

```
git push → musiclab 分支
    ↓
GitHub Actions
    ├── build job（BASE_PATH=/indie-launch-kit）
    │       └── 上传 artifact → deploy-github-pages
    │               └── https://ayxworxfr.github.io/indie-launch-kit/zh/
    │                   （含 APK 下载）
    │
    └── deploy-cloudflare job（无 BASE_PATH，独立构建）
            └── 删除 APK → wrangler deploy
                    └── https://musiclab.pages.dev/zh/
```

---

## 小结

| 问题 | 根因 | 解法 |
|---|---|---|
| 资源 404 | Astro 没配置 `base` | 设 `BASE_PATH` 环境变量 + `assetPath` 工具函数 |
| Cloudflare 样式丢失 | 复用了带子路径前缀的构建产物 | Cloudflare 独立构建，不传 `BASE_PATH` |
| APK 超限 | Cloudflare 25MB 单文件限制 | 部署前删 APK，下载链接改 GitHub Pages |
| URL 带 hash | wrangler 默认预览部署 | 加 `--branch=<生产分支>` 触发生产部署 |
| API 403 | Token 权限层级错误 | 选 Account → Cloudflare Pages → Edit |

折腾了一圈，核心问题只有一个：**GitHub Pages 需要 base 子路径，Cloudflare Pages 不需要，两者构建产物不能混用**。想清楚这一点，后面的问题都是顺着解决的。
