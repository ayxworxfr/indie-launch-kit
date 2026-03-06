# indie-launch-kit

> 独立开发者 App 推广落地页模板。修改一个 YAML 文件，5 分钟上线推广页。

**技术栈：** Astro 5 · Tailwind CSS 4 · YAML 配置驱动 · 双语 i18n · 零服务器部署

---

## 快速上手

### 第一步：克隆并安装

```bash
git clone https://github.com/your-username/indie-launch-kit.git my-app-landing
cd my-app-landing
make install
```

> 没有 `make`？等价命令：`npm install`

### 第二步：修改配置

编辑根目录下的 `app.config.yaml`，填入你的 App 信息：

```yaml
app:
  name: '你的 App 名'
  tagline:
    zh: '一句话描述'
    en: 'Your tagline'

# 站点域名（部署后务必填写，用于 canonical URL 和社交分享链接）
site_url: 'https://your-app.com'

theme:
  primary: '#667eea' # 改成你的品牌主色
  secondary: '#764ba2' # 渐变辅色

download:
  ios_url: 'https://apps.apple.com/...'
  android_url: 'https://play.google.com/...'
```

所有字段都有注释说明，改完即生效。

### 第三步：替换图片

将你的图片放到 `public/images/` 目录：

| 文件名               | 说明                          | 建议尺寸  |
| -------------------- | ----------------------------- | --------- |
| `icon.png`           | App 图标（Hero 区大图）       | 1024×1024 |
| `logo.png`           | 导航栏 Logo（可与 icon 相同） | 512×512   |
| `og-image.png`       | 社交分享预览图                | 1200×630  |
| `screenshot-1.png`   | 首屏截图（出现在 Hero 区）    | 750px+ 宽 |
| `screenshot-2.png` … | 更多截图（截图区展示）        | 750px+ 宽 |
| `qrcode.png`         | 扫码下载图（可选）            | 400×400   |

### 第四步：修改隐私政策和用户协议

编辑 `src/content/pages/` 目录下的 Markdown 文件：

- `privacy-zh.md` / `privacy-en.md` — 隐私政策
- `terms-zh.md` / `terms-en.md` — 用户协议

这两个页面是应用商店上架的必备材料。

### 第五步：本地预览

```bash
make dev
```

访问以下地址查看效果：

- http://localhost:4321/zh/ — 中文版
- http://localhost:4321/en/ — 英文版

### 第六步：构建部署

```bash
make build
# 构建产物在 dist/ 目录，上传到任意静态托管服务即可
```

---

## 常用命令

```bash
make install     # 安装依赖（首次使用）
make dev       # 启动开发服务器
make build     # 构建静态文件到 dist/
make preview   # 预览构建后的效果
make clean     # 清理 dist/ 和 .astro/
make clean-all # 深度清理（含 node_modules）
```

---

## 自动部署（推荐）

将代码推送到 GitHub，配置好 Secrets 后可自动构建并部署。

打开 `.github/workflows/deploy.yml`，取消注释对应的部署方案：

### 方案 A：腾讯云 COS（国内用户推荐）

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名        | 说明                                 |
| ---------------- | ------------------------------------ |
| `COS_SECRET_ID`  | 腾讯云 API 密钥 ID                   |
| `COS_SECRET_KEY` | 腾讯云 API 密钥 Key                  |
| `COS_BUCKET`     | 存储桶名称（如 `my-app-1234567890`） |
| `COS_REGION`     | 存储桶地域（如 `ap-guangzhou`）      |

### 方案 B：Cloudflare Pages（海外用户推荐）

| Secret 名       | 说明                 |
| --------------- | -------------------- |
| `CF_API_TOKEN`  | Cloudflare API Token |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID   |

`CF_PROJECT_NAME` 写死在 `deploy.yml` 中，修改为你的 Cloudflare Pages 项目名。

### 方案 C：GitHub Pages（最简单，无需额外配置）

取消注释 `deploy.yml` 中的 `deploy-github-pages` job，并在仓库 **Settings → Pages** 中将 Source 设为 `GitHub Actions`。

### 下载构建产物

每次 push 触发构建后，可在 GitHub Actions 的运行记录中找到 **dist** 产物（保留 7 天），点击下载 zip 包手动部署到任意主机。

---

## 目录结构

```
indie-launch-kit/
├── app.config.yaml              ← ★ 主配置（必改）
├── public/
│   ├── images/                  ← ★ 放截图和 Logo（必改）
│   └── robots.txt               ← SEO 爬虫配置
├── src/
│   ├── content/pages/           ← ★ 隐私政策和用户协议 Markdown（建议改）
│   ├── locales/                 ← UI 文案翻译（一般不需要改）
│   │   ├── zh.yaml
│   │   └── en.yaml
│   ├── components/              ← 页面组件（不需要动）
│   ├── layouts/                 ← 基础布局（不需要动）
│   ├── pages/                   ← 路由页面（不需要动）
│   └── utils/                   ← 工具函数（不需要动）
├── .github/workflows/deploy.yml ← GitHub Actions 部署工作流
└── Makefile                     ← 常用命令快捷方式
```

---

## 功能特性

- ✅ **纯配置驱动**：修改 `app.config.yaml` 即可定制全站，无需写代码
- ✅ **双语支持**：中英文自动切换，路由 `/zh/` 和 `/en/`
- ✅ **移动端适配**：全面响应式，移动菜单、截图横滑均已适配
- ✅ **主题定制**：改两个颜色值，全站品牌色（渐变、按钮、链接）立即更新
- ✅ **纯静态输出**：无服务器，可部署到 COS / Cloudflare Pages / GitHub Pages
- ✅ **SEO 友好**：canonical URL、Open Graph、Twitter Card、robots.txt 全齐
- ✅ **公告横幅**：可配置的顶部公告，用户关闭后记忆状态（localStorage）
- ✅ **内容页**：隐私政策和用户协议 Markdown 渲染，上架应用商店必备
- ✅ **GitHub Actions**：三种一键部署方案 + 构建产物可下载

---

## License

MIT
