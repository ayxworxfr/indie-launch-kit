# License Server

基于 Cloudflare Workers 的激活码购买服务。用户输入设备 ID、选择套餐后，通过支付宝扫码付款，系统自动生成 Ed25519 会员码并发送至邮箱。

会员码算法与 musiclab 项目完全兼容，使用同一密钥对，客户端无需修改即可验证。

## 目录结构

```
src/
  core/
    db.ts           D1 订单操作（创建/查询/标记已付款）
    license.ts      Ed25519 会员码生成（与 musiclab 算法一致）
  routes/
    order.ts        POST /api/order/create、GET /api/order/status
    callback.ts     POST /api/payment/callback（支付宝异步通知）
  services/
    alipay.ts       支付宝当面付 API + RSA2 签名验证
    mail.ts         Resend 邮件发送
  types.ts          类型定义 + 套餐配置（PLANS）
  utils.ts          base64 编解码工具
  ui.ts             内联 HTML 付款页（无需单独前端项目）
  index.ts          Hono 路由挂载入口
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置本地密钥

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`，填入真实值（此文件已在 `.gitignore` 中，不会提交）。

测试阶段建议先开启两个跳过开关：

```ini
SKIP_PAYMENT=true   # 跳过支付宝，直接生成激活码
SKIP_EMAIL=true     # 跳过 Resend，激活码只在控制台打印
```

### 3. 创建本地数据库

```bash
npx wrangler d1 execute license-db --local --file=src/schema.sql
```

> 注意：`--local` 表示操作本地 SQLite（`.wrangler/state/`），不影响远程数据库。
> 每次清空 `.wrangler/` 目录后需要重新执行此命令。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:8787` 即可看到购买页面。

开启 `SKIP_PAYMENT=true` 后，提交表单会直接完成订单，无需扫码，前端 3 秒内显示激活码。激活码同时打印在 wrangler 控制台（需同时开启 `SKIP_EMAIL=true`）。

## 生产部署

### 1. 创建远程 D1 数据库

```bash
npx wrangler d1 create license-db
```

将输出的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "license-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

初始化表结构：

```bash
npm run db:init
```

### 2. 写入密钥

```bash
npx wrangler secret put ED25519_PRIVATE_KEY   # musiclab/tools/keys/private_key.txt 的内容
npx wrangler secret put ALIPAY_APP_ID
npx wrangler secret put ALIPAY_PRIVATE_KEY    # PKCS#8 格式 base64（去掉头尾行）
npx wrangler secret put ALIPAY_PUBLIC_KEY     # 支付宝平台公钥，SPKI 格式 base64
npx wrangler secret put RESEND_API_KEY
```

### 3. 修改配置

编辑 `wrangler.toml`：

```toml
[vars]
WORKER_URL   = "https://license-server.your-name.workers.dev"
FROM_EMAIL   = "noreply@yourdomain.com"   # 需在 Resend 验证域名，见下方说明
PRODUCT_NAME = "MusicLab"
SKIP_PAYMENT = "false"
SKIP_EMAIL   = "false"
```

**FROM_EMAIL 说明：**

| 场景 | 填写值 | 说明 |
|---|---|---|
| 测试阶段（无自有域名） | `onboarding@resend.dev` | 无需验证域名，但只能发到 Resend 账号注册邮箱 |
| 正式上线 | `noreply@yourdomain.com` | 需在 [resend.com/domains](https://resend.com/domains) 添加并验证域名 |

### 4. 部署

**方式 A：手动部署**

```bash
npm run deploy
```

**方式 B：GitHub Actions 自动部署（推荐）**

推送 `musiclab` 分支且 `license-server/` 目录有变更时自动触发。

需要在仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名 | 说明 |
|---|---|
| `CF_API_TOKEN` | Cloudflare API Token（创建方式见下方） |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID（Dashboard 右侧边栏可找到） |

**CF_API_TOKEN 创建方式：**

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com) → 右上角头像 → **My Profile → API Tokens**
2. 点击 **Create Token** → 选择 **Create Custom Token**
3. 填写 Token 名称（如 `github-actions`），添加以下权限：

   | 类型 | 资源 | 操作 |
   |---|---|---|
   | Account | Cloudflare Pages | Edit |
   | Account | Cloudflare Workers Scripts | Edit |
   | Account | D1 | Edit |

4. Account Resources 选择你的账户，点击 **Continue to summary → Create Token**
5. 复制生成的 Token 填入 GitHub Secrets

> **已有 Token 只有 Pages 权限？** 进入 API Tokens 列表 → 找到现有 Token → **Edit** → 添加上述两条权限后保存即可，无需重新创建。

> **为什么不能复用 Pages 的 Token？** Cloudflare Pages 和 Workers 是两个独立的产品，权限隔离。Pages 的 Token 只有 `Cloudflare Pages: Edit` 权限，无法操作 Workers 和 D1，部署时会报 `403 Authentication error`。

## 环境变量说明

| 变量 | 类型 | 说明 |
|---|---|---|
| `ED25519_PRIVATE_KEY` | Secret | musiclab Ed25519 私钥种子（base64，32 字节） |
| `ALIPAY_APP_ID` | Secret | 支付宝应用 ID |
| `ALIPAY_PRIVATE_KEY` | Secret | 应用私钥（PKCS#8 base64，无头尾行） |
| `ALIPAY_PUBLIC_KEY` | Secret | 支付宝平台公钥（SPKI base64，用于验证回调签名） |
| `RESEND_API_KEY` | Secret | Resend API Key |
| `WORKER_URL` | Var | Workers 部署 URL，用于拼接支付宝回调地址 |
| `FROM_EMAIL` | Var | 发件人地址（需在 Resend 验证域名） |
| `PRODUCT_NAME` | Var | 产品名称，显示在页面和邮件中 |
| `SKIP_PAYMENT` | Var | `"true"` 跳过支付宝，直接生成激活码（仅测试用） |
| `SKIP_EMAIL` | Var | `"true"` 跳过邮件，激活码只打印到控制台（仅测试用） |

## 套餐配置

套餐名称、价格、功能列表在 `src/types.ts` 的 `PLANS` 对象中修改：

```typescript
export const PLANS: Record<Plan, PlanConfig> = {
  monthly:  { name: '月度会员', price: 29,  durationDays: 30,   ... },
  yearly:   { name: '年度会员', price: 99,  durationDays: 365,  ... },
  lifetime: { name: '永久会员', price: 198, durationDays: null, ... },
}
```

修改后重新 `npm run deploy` 即可生效。

## 获取 Ed25519 私钥

私钥由 musiclab 项目生成，路径为 `musiclab/tools/keys/private_key.txt`（gitignore 中，不在仓库里）。

如果尚未生成，在 musiclab 项目根目录执行：

```bash
dart run tools/generate_keys.dart
```

生成后将 `private_key.txt` 的内容（纯 base64 字符串）填入 `ED25519_PRIVATE_KEY`。

## 支付宝密钥格式说明

支付宝开放平台提供的密钥通常是 PKCS#8 格式（应用私钥）和 X.509 格式（平台公钥）。

`ALIPAY_PRIVATE_KEY` 和 `ALIPAY_PUBLIC_KEY` 存入的是**去掉 `-----BEGIN/END-----` 头尾行、去掉换行后的纯 base64 字符串**。

如果你的私钥是 PKCS#1 格式，先转换：

```bash
openssl pkcs8 -topk8 -inform PEM -in pkcs1_key.pem -outform PEM -nocrypt
```
