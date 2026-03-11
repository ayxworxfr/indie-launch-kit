import { fromBase64 } from '../utils'
import type { Plan } from '../types'
import { PLANS } from '../types'

const ALIPAY_GATEWAY = 'https://openapi.alipay.com/gateway.do'

/**
 * 调用支付宝当面付 precreate 接口，生成动态收款二维码 URL。
 * 使用 RSA2（SHA256withRSA）签名。
 */
export async function createAlipayOrder(opts: {
  tradeNo: string
  plan: Plan
  notifyUrl: string
  appId: string
  privateKeyBase64: string
}): Promise<string> {
  const planConfig = PLANS[opts.plan]

  const params: Record<string, string> = {
    app_id: opts.appId,
    method: 'alipay.trade.precreate',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: getAlipayTimestamp(),
    version: '1.0',
    notify_url: opts.notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: opts.tradeNo,
      total_amount: planConfig.price.toFixed(2),
      subject: `${planConfig.name}激活码`,
    }),
  }

  params.sign = await rsaSign(buildSignContent(params), opts.privateKeyBase64)

  const response = await fetch(ALIPAY_GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: new URLSearchParams(params),
  })

  type PrecreateResp = {
    alipay_trade_precreate_response: { code: string; msg: string; qr_code: string }
  }

  const data = await response.json<PrecreateResp>()
  const result = data.alipay_trade_precreate_response

  if (result.code !== '10000') {
    throw new Error(`支付宝创建订单失败 [${result.code}]: ${result.msg}`)
  }

  return result.qr_code
}

/**
 * 验证支付宝异步回调通知的 RSA2 签名。
 * 规则：排除 sign 和 sign_type 字段，其余按 key 字母升序拼接后验签。
 */
export async function verifyAlipayCallback(
  params: Record<string, string>,
  publicKeyBase64: string,
): Promise<boolean> {
  const { sign, sign_type: _signType, ...signParams } = params
  if (!sign) return false
  return rsaVerify(buildSignContent(signParams), sign, publicKeyBase64)
}

/** 过滤空值后按 key 字母升序排列，拼接为 key=value&... */
function buildSignContent(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

async function rsaSign(content: string, privateKeyBase64: string): Promise<string> {
  const keyDer = fromBase64(privateKeyBase64)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(content),
  )
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
}

async function rsaVerify(
  content: string,
  signatureBase64: string,
  publicKeyBase64: string,
): Promise<boolean> {
  try {
    const keyDer = fromBase64(publicKeyBase64)
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      keyDer.buffer as ArrayBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const signatureBytes = fromBase64(signatureBase64)
    return crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(content),
    )
  } catch {
    return false
  }
}

/** 生成符合支付宝要求的时间戳（Asia/Shanghai，YYYY-MM-DD HH:mm:ss）*/
function getAlipayTimestamp(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}
