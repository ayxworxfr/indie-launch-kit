# indie-launch-kit 设计文档

> 面向独立开发者的 App 推广落地页模板，基于 Astro + Tailwind CSS + YAML 配置驱动，支持双语国际化，零服务器部署。

---

## 一、项目定位

### 核心价值

独立开发者只需要：

1. 修改 `app.config.yaml` 填入 App 信息
2. 在 `src/content/pages/` 目录写 Markdown（隐私政策、用户协议）
3. 将截图和 Logo 放入 `public/images/`
4. `git push` → GitHub Actions 自动构建 → 部署到 COS / Cloudflare Pages / GitHub Pages

**不需要懂前端，不需要写代码，不需要服务器。**

### 目标用户

- 移动端独立开发者（Flutter / iOS / Android / React Native）
- 需要上架应用商店（必须提供隐私政策页面）
- 面向国内或海外用户，需要双语支持
- 早期阶段，不想花钱搭后台

---

## 二、技术栈

| 技术         | 版本 | 用途                                              |
| ------------ | ---- | ------------------------------------------------- |
| Astro        | ^5.x | 静态站点生成，构建产物为纯 HTML                   |
| Tailwind CSS | ^4.x | 样式，通过 Vite 插件集成，主题色通过 CSS 变量配置 |
| js-yaml      | ^4.x | 解析用户的 YAML 配置文件                          |
| astro i18n   | 内置 | 双语路由（`/zh/`、`/en/`），prefixDefaultLocale   |

**构建产物**：纯静态 HTML/CSS/JS，可直接上传到任何静态托管服务。

---

## 三、目录结构

```
indie-launch-kit/
│
├── app.config.yaml              # ★ 用户主配置（唯一需要修改的配置）
│
├── public/
│   ├── images/                  # ★ 用户放静态资源（截图、Logo、二维码等）
│   │   └── .gitkeep
│   └── robots.txt               # 允许所有爬虫（SEO 基础配置）
│
├── src/
│   ├── content/
│   │   └── pages/               # ★ 用户写的 Markdown 内容
│   │       ├── privacy-zh.md    # 隐私政策（中文）
│   │       ├── privacy-en.md    # 隐私政策（英文）
│   │       ├── terms-zh.md      # 用户协议（中文）
│   │       └── terms-en.md      # 用户协议（英文）
│   │
│   ├── locales/                 # UI 文案国际化（模板已内置，一般不需要动）
│   │   ├── zh.yaml              # 中文 UI 文案
│   │   └── en.yaml              # 英文 UI 文案
│   │
│   ├── components/
│   │   ├── Announcement.astro   # 顶部公告横幅（可配置显隐）
│   │   ├── Header.astro         # 顶部导航（Logo + 导航链接 + 语言切换）
│   │   ├── Hero.astro           # 主视觉区（slogan + 下载按钮 + 首图）
│   │   ├── Features.astro       # 功能亮点区（图标卡片组）
│   │   ├── Screenshots.astro    # 截图展示区（移动端横滑）
│   │   ├── Download.astro       # 下载区（按钮 + 二维码）
│   │   ├── Footer.astro         # 页脚（版权 + 链接 + 联系方式）
│   │   └── LanguageSwitcher.astro # 语言切换按钮
│   │
│   ├── layouts/
│   │   └── Base.astro           # 基础布局（head meta、OG 标签、CSS 变量注入）
│   │
│   ├── pages/
│   │   ├── index.astro          # 根路径，重定向到默认语言
│   │   └── [lang]/
│   │       ├── index.astro      # 首页
│   │       ├── privacy.astro    # 隐私政策页
│   │       └── terms.astro      # 用户协议页
│   │
│   ├── styles/
│   │   └── global.css           # 全局样式（Tailwind 指令 + 自定义工具类）
│   │
│   ├── content.config.ts        # Astro 内容集合配置（定义 Markdown 集合）
│   └── utils/
│       ├── config.ts            # 读取并校验 app.config.yaml，带缓存
│       └── i18n.ts              # i18n 工具函数（useTranslations、lv）
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions：构建 + 三种部署方案
│
├── astro.config.mjs             # Astro 配置（site、i18n 路由、Tailwind 集成）
├── package.json
├── tsconfig.json
├── Makefile                     # 常用命令快捷方式
└── README.md
```

---

## 四、app.config.yaml 完整 Schema

这是用户唯一需要认真填写的文件，设计原则：**注释即文档，字段名自解释**。

```yaml
# ============================================================
# indie-launch-kit 配置文件
# 修改这个文件，然后 git push，你的推广页就更新了
# ============================================================

app:
  name: '乐理通'
  tagline:
    zh: '让每个人都能学好乐理'
    en: 'Music Theory for Everyone'
  description:
    zh: '乐理通是一款专为音乐爱好者设计的乐理学习 App'
    en: 'A music theory learning app for music enthusiasts'
  icon: '/images/icon.png' # App 图标（建议 1024×1024，显示在 Hero 区域）
  logo: '/images/logo.png' # 导航栏 Logo（可与 icon 使用同一张图）

# 站点域名：用于生成 canonical URL 和 og:url，对 SEO 非常重要
# 格式：https://你的域名（结尾不加斜杠）
# 本地开发时留空即可，部署后务必填写
site_url: 'https://your-app.com'

# 主题色，支持任意合法 CSS 颜色值
theme:
  primary: '#667eea' # 主色（渐变起点，也是按钮/链接的主色）
  secondary: '#764ba2' # 辅色（渐变终点）

# 下载链接，不需要的平台留空即可（留空则对应按钮不显示）
download:
  ios_url: 'https://apps.apple.com/app/id123456789'
  android_url: 'https://play.google.com/store/apps/details?id=com.example.app'
  apk_url: '' # 直链 APK（可选）
  qrcode: '/images/qrcode.png' # 扫码下载图（可选）

# 功能亮点，建议 3~4 个
features:
  - icon: '🎵'
    title:
      zh: '系统化学习路径'
      en: 'Systematic Learning Path'
    description:
      zh: '从基础乐理到高级和声，循序渐进'
      en: 'From basic theory to advanced harmony, step by step'

# 截图列表，按顺序展示
# 第 1 张同时出现在 Hero 区域；截图区只在 >= 2 张时渲染
screenshots:
  - src: '/images/screenshot-1.png'
    alt:
      zh: '主界面截图'
      en: 'Main screen'
  - src: '/images/screenshot-2.png'
    alt:
      zh: '练习界面截图'
      en: 'Exercise screen'

# 顶部公告横幅（可选）
announcement:
  enabled: false
  content:
    zh: '🎉 2.0 版本正式发布！全新 UI 设计，体验更流畅'
    en: '🎉 Version 2.0 is now live! New UI, smoother experience'

# SEO 与社交分享
seo:
  og_image: '/images/og-image.png' # 社交分享预览图（建议 1200×630）
  twitter_handle: '' # Twitter/X 账号（留空则不输出）

# 页脚
footer:
  copyright: '乐理通' # 版权主体，显示为 © 2026 乐理通
  contact_email: 'hello@example.com'
  links: [] # 额外自定义链接

# 默认语言：首次访问 / 根路径重定向目标
default_locale: 'zh' # zh 或 en
```

---

## 五、国际化（i18n）设计

### 路由结构

```
/              → 重定向到 /zh/（根据 default_locale）
/zh/           → 中文首页
/zh/privacy    → 中文隐私政策
/zh/terms      → 中文用户协议
/en/           → 英文首页
/en/privacy    → 英文隐私政策
/en/terms      → 英文用户协议
```

Astro 内置 i18n 路由，`prefixDefaultLocale: true` 确保两种语言 URL 格式一致。

### 文案分两层

| 层级       | 文件                                          | 内容                                                 |
| ---------- | --------------------------------------------- | ---------------------------------------------------- |
| **内容层** | `app.config.yaml`                             | App 专属文案（slogan、功能描述等），用户必须翻译     |
| **UI 层**  | `src/locales/zh.yaml` / `src/locales/en.yaml` | 界面通用文案（"立即下载"、"隐私政策"等），模板已内置 |

`src/locales/zh.yaml` 完整结构：

```yaml
nav:
  home: '首页'
  privacy: '隐私政策'
  terms: '用户协议'
  menu_open: '打开菜单'
  menu_close: '关闭菜单'

hero:
  ios_download: 'App Store 下载'
  android_download: 'Google Play 下载'
  apk_download: 'APK 直接下载'

sections:
  features: '核心功能'
  screenshots: '应用截图'
  download: '立即下载'
  download_subtitle: '选择你的平台，免费下载'

footer:
  rights: '保留所有权利'
  built_with: '使用 indie-launch-kit 构建'
  contact: '联系我们'

announcement:
  dismiss: '知道了'
```

### LocalizedString 工具函数

`src/utils/i18n.ts` 导出两个核心函数：

- `useTranslations(lang)` → 返回 `t(key)` 函数，用于读取 UI 层文案
- `lv(localizedString, lang)` → 读取 `LocalizedString` 对象的指定语言值，用于读取内容层文案

---

## 六、主题定制机制

用户在 `app.config.yaml` 的 `theme` 字段填写两个颜色值。`Base.astro` 在构建时将其注入为 `<body>` 的 `style` 属性：

```html
<body
  style="--app-primary:#667eea;--app-secondary:#764ba2;--app-gradient:linear-gradient(135deg,#667eea,#764ba2)"
></body>
```

所有组件通过 `var(--app-primary)`、`var(--app-secondary)`、`var(--app-gradient)` 取用，实现全站一键换色。

`src/styles/global.css` 中定义了配套的 Tailwind 工具类：

- `bg-app-gradient` — 渐变背景
- `text-app-primary` — 主色文字
- `bg-app-primary` — 主色背景
- `btn-download-primary` — 主下载按钮
- `btn-download-ghost` — 次要下载按钮（APK 直链）

---

## 七、SEO 实现

`Base.astro` 在每个页面的 `<head>` 中输出完整的 SEO 标签：

| 标签                         | 来源                       | 说明                                  |
| ---------------------------- | -------------------------- | ------------------------------------- |
| `<meta name="description">`  | `app.description`（i18n）  | 搜索引擎摘要                          |
| `<link rel="canonical">`     | `site_url` + 当前路径      | 避免重复收录，`site_url` 为空时不输出 |
| `<meta property="og:*">`     | config + 当前页面信息      | 微信/微博/Twitter 分享预览            |
| `<meta property="og:url">`   | `site_url` + 当前路径      | 分享链接，`site_url` 为空时不输出     |
| `<meta property="og:image">` | `seo.og_image`（绝对路径） | 分享预览图                            |

`public/robots.txt` 允许所有爬虫访问全站。

---

## 八、首页模块结构

```
┌─────────────────────────────────────────┐
│ Header：Logo + 导航链接 + 语言切换        │
│         （滚动后自动加背景模糊效果）      │
├─────────────────────────────────────────┤
│ Announcement：可配置公告横幅             │
│               （用户关闭后 localStorage  │
│               记忆，内容变更则重新显示）  │
├─────────────────────────────────────────┤
│ Hero：                                   │
│   App 图标（圆角大图）                   │
│   主标题（App 名称）                     │
│   副标题（tagline，双语）                │
│   下载按钮组（iOS / Android / APK）      │
│   右侧首张截图（screenshots[0]）         │
│   ↳ 无截图时纯文字居中布局               │
├─────────────────────────────────────────┤
│ Features：功能亮点卡片组                  │
│   每张卡片：Emoji 图标 + 标题 + 描述     │
├─────────────────────────────────────────┤
│ Screenshots：截图展示区                  │
│   >= 2 张截图时才渲染（第 1 张已在 Hero） │
│   移动端：overflow-x 横向滑动 + snap     │
│   桌面端：flex-wrap 自动折行居中         │
├─────────────────────────────────────────┤
│ Download：再次放下载按钮 + 二维码        │
├─────────────────────────────────────────┤
│ Footer：版权 + 导航链接 + 联系邮箱       │
│         built with indie-launch-kit      │
└─────────────────────────────────────────┘
```

内容页（`privacy.astro` / `terms.astro`）：Header + Markdown 正文 + Footer，正文通过 Astro 内容集合渲染。

---

## 九、GitHub Actions 工作流

`.github/workflows/deploy.yml` 采用**构建与部署分离**的设计：

```
push to main
    │
    ▼
┌─────────────────────────────────────┐
│ build job                           │
│  1. npm ci                          │
│  2. npm run build                   │
│  3. upload-artifact (dist/, 7天)    │
└─────────────────────────────────────┘
    │
    ├──→ deploy-cos          （取消注释启用，需配置 Secrets）
    ├──→ deploy-cloudflare   （取消注释启用，需配置 Secrets）
    └──→ deploy-github-pages （取消注释启用，无需额外 Secrets）
```

**构建产物下载**：每次 push 构建完成后，可在 GitHub Actions 运行记录页面下载 `dist.zip`（保留 7 天），用于手动部署到任意主机。

### 各方案所需 Secrets

| 部署目标         | Secret 名        | 说明                               |
| ---------------- | ---------------- | ---------------------------------- |
| 腾讯云 COS       | `COS_SECRET_ID`  | 腾讯云 API 密钥 ID                 |
|                  | `COS_SECRET_KEY` | 腾讯云 API 密钥 Key                |
|                  | `COS_BUCKET`     | 存储桶名称，如 `my-app-1234567890` |
|                  | `COS_REGION`     | 地域，如 `ap-guangzhou`            |
| Cloudflare Pages | `CF_API_TOKEN`   | Cloudflare API Token               |
|                  | `CF_ACCOUNT_ID`  | Cloudflare 账户 ID                 |
| GitHub Pages     | —                | 无需配置，仓库 Settings 开启即可   |

---

## 十、关键设计决策

### 为什么不用 `tailwind.config.js`？

Tailwind CSS 4 通过 Vite 插件（`@tailwindcss/vite`）集成，不再需要独立的配置文件。自定义工具类写在 `src/styles/global.css` 的 `@layer` 中。

### 为什么配置缓存在内存里？

`src/utils/config.ts` 中 `getConfig()` 使用模块级变量缓存，Astro 构建期只读一次文件，避免每个页面都重复 I/O。

### screenshots[0] 为什么在 Hero 里而不在截图区？

Hero 区的截图起到"产品展示封面"的作用，视觉权重更高。截图区用来展示更多截图，两者分工不同。因此截图区的条件是 `screenshots.length > 1`，避免单张截图时重复展示。

### aria-label 如何做到双语？

`Header.astro` 通过 Astro 服务端渲染将翻译后的文案写入 `data-label-open` 和 `data-label-close` 属性，客户端 JS 在菜单开关时读取这两个属性动态更新 `aria-label`，既保证了无障碍访问，又避免了硬编码。
