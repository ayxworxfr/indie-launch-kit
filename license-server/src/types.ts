export interface Env {
  DB: D1Database
  /** musiclab Ed25519 私钥种子（32 字节 base64，与 musiclab tools/keys/ 同一密钥对）*/
  ED25519_PRIVATE_KEY: string
  ALIPAY_APP_ID: string
  /** 应用私钥，PKCS#8 base64，无 -----BEGIN/END----- 头部 */
  ALIPAY_PRIVATE_KEY: string
  /** 支付宝平台公钥，SPKI base64，用于验证回调签名 */
  ALIPAY_PUBLIC_KEY: string
  RESEND_API_KEY: string
  /** Workers 部署 URL，用于拼接支付宝回调地址 */
  WORKER_URL: string
  FROM_EMAIL: string
  PRODUCT_NAME: string
  /** "true" 跳过支付宝调用，直接生成激活码（仅本地测试）*/
  SKIP_PAYMENT: string
  /** "true" 跳过邮件发送，激活码仅打印至控制台（仅本地测试）*/
  SKIP_EMAIL: string
}

/** Workers env 变量均为字符串，此函数统一处理布尔开关判断 */
export const isTrue = (val: string): boolean => val === 'true'

export type Plan = 'monthly' | 'yearly' | 'lifetime'

export const VALID_PLANS = new Set<Plan>(['monthly', 'yearly', 'lifetime'])

export interface Order {
  id: number
  trade_no: string
  device_id: string
  email: string
  plan: Plan
  license_key: string | null
  amount: string
  status: 'pending' | 'paid'
  created_at: string
}

export interface PlanConfig {
  name: string
  price: number
  /** 有效天数，null 表示永久 */
  durationDays: number | null
  features: string[]
  badge?: string
}

/**
 * 套餐配置，与 musiclab features.dart 的功能列表保持对齐。
 * 价格修改此处即可，功能集由 core/license.ts 的 PLAN_FEATURES 维护。
 */
export const PLANS: Record<Plan, PlanConfig> = {
  monthly: {
    name: '月度会员',
    price: 29,
    durationDays: 30,
    features: ['解锁全部课程', '高级练习模式', '识谱进阶难度'],
  },
  yearly: {
    name: '年度会员',
    price: 99,
    durationDays: 365,
    features: ['解锁全部课程', '高级练习模式', '识谱进阶难度', '乐谱编辑器', 'PDF 高清导出'],
    badge: '推荐',
  },
  lifetime: {
    name: '永久会员',
    price: 198,
    durationDays: null,
    features: ['解锁全部课程', '高级练习模式', '识谱进阶难度', '乐谱编辑器', 'PDF 高清导出', '多音源支持'],
  },
}
