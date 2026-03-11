# License Server 设计文档

## 概述

在 `indie-launch-kit/license-server/` 下创建一个独立的 Cloudflare Workers 子项目，实现「用户输入设备 ID → 选择套餐 → 支付宝付款 → 自动生成 Ed25519 会员码 → 邮件发货」的完整购买流程。

会员码算法与 musiclab 项目完全对齐，生成的会员码可直接被 musiclab 客户端验证，无需修改客户端代码。

---

## 目录结构

```
indie-launch-kit/
  license-server/
    src/
      index.ts        # Hono 路由入口 + 前端 HTML 模板
      license.ts      # Ed25519 会员码生成（复用 musiclab 算法）
      payment.ts      # 支付宝当面付：创建订单 + 回调处理
      db.ts           # D1 数据库操作封装
      mail.ts         # Resend 发邮件
    wrangler.toml     # Workers 配置（D1 绑定、环境变量）
    package.json
    tsconfig.json
```

---

## 整体购买流程

```
用户访问付款页
    │
    ▼
填写表单：邮箱 + 设备 ID + 选择套餐
    │  前端校验：邮箱格式、设备 ID 16 位大写十六进制
    ▼
POST /api/order/create
    │  Workers 生成订单号（ORDER_时间戳_随机串）
    │  调支付宝 precreate API → 获取动态收款二维码 URL
    ▼
前端展示二维码，每 3 秒轮询 /api/order/status
    │
    ▼
用户扫码付款成功
    │
    ▼
支付宝 POST /api/payment/callback
    │  验证 RSA2 签名
    │  幂等检查（订单号去重）
    │  Ed25519 私钥签名 → 生成会员码
    │  写入 D1 数据库
    │  Resend 发邮件（含会员码）
    ▼
前端轮询到 paid 状态 → 展示会员码
```

---

## 会员码格式

与 musiclab 完全一致，采用 **Ed25519 非对称签名**。

**格式：**`PREFIX.PAYLOAD_BASE64URL.SIGNATURE_BASE64URL`

**示例：**`PRO.eyJmIjpbImEiLCJ2IiwibildfQ.MEUCIQDabc...`

**Payload（JSON 压缩后 Base64Url 编码，无 `=` 填充）：**

```json
{
  "f": ["a", "v", "n", "e", "x", "m"],
  "e": 0,
  "p": "l",
  "i": 1741651200,
  "d": "A1B2C3D4E5F60708"
}
```

| 字段 | 含义 | 说明 |
|---|---|---|
| `f` | 功能短码数组 | 见功能列表 |
| `e` | 过期时间戳（Unix 秒） | `0` = 永久有效 |
| `p` | 套餐短码 | `m` / `y` / `l` |
| `i` | 签发时间戳 | |
| `d` | 设备 ID | 用户在表单中填写，始终绑定 |

---

## 套餐定义

与 musiclab 的 `lib/core/license/features.dart` 保持对齐。

| 套餐 | 前缀 | 套餐短码 | 时长 | 包含功能 |
|---|---|---|---|---|
| 月度会员 | `MON` | `m` | 30 天 | `a` `v` `n` |
| 年度会员 | `YR` | `y` | 365 天 | `a` `v` `n` `e` `x` |
| 永久会员 | `PRO` | `l` | 永久（e=0）| `a` `v` `n` `e` `x` `m` |

功能短码对照：

| 短码 | 功能常量 | 说明 |
|---|---|---|
| `a` | `all_courses` | 解锁全部课程 |
| `v` | `adv_practice` | 高级练习模式 |
| `n` | `note_adv` | 识谱进阶难度 |
| `e` | `sheet_edit` | 乐谱编辑器 |
| `x` | `sheet_export` | 高清 PDF 导出 |
| `m` | `multi_voice` | 多音源（吉他/小提琴）|

---

## API 接口

### `GET /`
返回付款页 HTML（由 Workers 内联渲染，无需单独 Pages 项目）。

---

### `POST /api/order/create`

**请求体：**
```json
{
  "email": "user@example.com",
  "deviceId": "A1B2C3D4E5F60708",
  "plan": "monthly"
}
```

**响应：**
```json
{
  "ok": true,
  "tradeNo": "ORDER_1741651200000_AB3F",
  "qrCode": "https://qr.alipay.com/xxx"
}
```

**逻辑：**
1. 校验 email 格式、deviceId 为 16 位大写十六进制、plan 合法
2. 生成唯一订单号
3. 调支付宝 `alipay.trade.precreate`，附带 email 在 body 字段（回调时取回）
4. 写入 D1（status = `pending`）
5. 返回二维码 URL

---

### `GET /api/order/status?tradeNo=xxx`

**响应（pending）：**
```json
{ "status": "pending" }
```

**响应（paid）：**
```json
{
  "status": "paid",
  "licenseKey": "PRO.eyJmIjpb....MEUCIQDabc..."
}
```

---

### `POST /api/payment/callback`

支付宝异步通知回调，内部逻辑：

1. **验证 RSA2 签名**（防伪造）
2. 检查 `trade_status == TRADE_SUCCESS`
3. **幂等检查**：查 D1，若订单已处理直接返回 `success`
4. **生成会员码**：用 Ed25519 私钥签名
5. 更新 D1（status = `paid`，写入 licenseKey）
6. 调 Resend 发邮件
7. 返回纯文本 `success`（必须，否则支付宝持续重试 25 次）

---

## 数据库（D1）

```sql
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_no    TEXT UNIQUE NOT NULL,  -- 唯一索引，用于幂等检查
  device_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  plan        TEXT NOT NULL,         -- monthly / yearly / lifetime
  license_key TEXT,                  -- 付款后生成
  amount      TEXT,
  status      TEXT DEFAULT 'pending',-- pending / paid
  created_at  TEXT NOT NULL
);
```

---

## 密钥管理

| 密钥 | 来源 | 存储方式 |
|---|---|---|
| Ed25519 私钥 | musiclab/tools/keys/（与客户端同一密钥对）| `wrangler secret put ED25519_PRIVATE_KEY` |
| Ed25519 公钥 | 已内置于 musiclab Flutter 客户端 | 无需存储，客户端内验证 |
| 支付宝应用私钥 | 支付宝开放平台 | `wrangler secret put ALIPAY_PRIVATE_KEY` |
| 支付宝公钥 | 支付宝开放平台 | `wrangler secret put ALIPAY_PUBLIC_KEY` |
| Resend API Key | resend.com | `wrangler secret put RESEND_API_KEY` |

**安全原则：**
- 私钥只通过 `wrangler secret put` 写入，不进代码仓库
- `.gitignore` 需包含 `wrangler.toml` 中所有本地密钥文件

---

## wrangler.toml 配置

```toml
name = "license-server"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "license-db"
database_id = "待创建后填写"

[vars]
SITE_URL = "https://yourdomain.com"
WORKER_URL = "https://license-server.your-name.workers.dev"
FROM_EMAIL = "noreply@yourdomain.com"
```

---

## 技术选型

| 模块 | 选择 | 理由 |
|---|---|---|
| Web 框架 | Hono | 专为 Cloudflare Workers 设计，体积极小 |
| Ed25519 签名 | `@noble/ed25519` | 纯 JS，无 Node.js 依赖，兼容 Workers 运行时 |
| 数据库 | Cloudflare D1（SQLite）| 免费额度足够，与 Workers 原生集成 |
| 邮件 | Resend | 免费 3000 封/月，API 简洁 |
| 前端渲染 | Hono 内联 HTML | 页面极简，无需独立 Pages 项目和构建步骤 |

---

## 关键安全要点

1. **签名验签不能省**：支付宝回调用 RSA2 验签，防止伪造请求绕过付款直接拿码
2. **幂等处理**：支付宝在网络抖动时最多重试 25 次，订单号唯一索引保证只生成一次会员码
3. **回调必须返回 `success`**：返回其他内容会触发支付宝持续重试
4. **设备 ID 格式校验**：前端 + 后端双重校验，确保 payload 格式合法（16 位大写十六进制）
5. **私钥隔离**：Ed25519 私钥与支付宝密钥均通过 Workers Secrets 管理，不出现在 `.toml` 或代码中

---

## 部署步骤（上线前清单）

```bash
# 1. 安装依赖
cd license-server && npm install

# 2. 创建 D1 数据库
npx wrangler d1 create license-db
# 将输出的 database_id 填入 wrangler.toml

# 3. 初始化数据库表
npx wrangler d1 execute license-db --file=src/schema.sql

# 4. 写入所有 Secrets
npx wrangler secret put ED25519_PRIVATE_KEY
npx wrangler secret put ALIPAY_APP_ID
npx wrangler secret put ALIPAY_PRIVATE_KEY
npx wrangler secret put ALIPAY_PUBLIC_KEY
npx wrangler secret put RESEND_API_KEY

# 5. 本地开发测试
npx wrangler dev

# 6. 部署
npx wrangler deploy
```

---

## 与 musiclab 客户端的关系

```
license-server（Workers）          musiclab（Flutter App）
        │                                    │
        │  使用同一把 Ed25519 私钥签名         │  内置 Ed25519 公钥验签
        │                                    │
        └──────── 会员码字符串 ───────────────┘
                  PREFIX.PAYLOAD.SIG
```

- Workers 用私钥**生成**会员码
- Flutter 客户端用公钥**验证**会员码
- 两者使用同一密钥对，用户在客户端激活页输入会员码后，客户端本地验证，无需联网
- 设备 ID 由客户端 `device_helper.dart` 生成（16 位大写十六进制），用户复制后填入付款页

---

## 后续可扩展方向

- 增加 Paddle 支付支持（面向海外用户）
- 增加 `/api/license/verify` 接口（供后台查询某设备的激活状态）
- 增加订单管理后台（简单的 HTML 页面，需要 Basic Auth 保护）
- 会员码支持多设备（将 `d` 字段改为 `*` 通配符，或存多个设备 ID）
