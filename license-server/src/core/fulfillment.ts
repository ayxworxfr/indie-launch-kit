import type { Env, Plan } from '../types'
import { isTrue } from '../types'
import { markOrderPaid } from './db'
import { generateLicense } from './license'
import { sendLicenseEmail } from '../services/mail'

type FulfillEnv = Pick<
  Env,
  'ED25519_PRIVATE_KEY' | 'RESEND_API_KEY' | 'FROM_EMAIL' | 'PRODUCT_NAME' | 'SKIP_EMAIL'
>

/**
 * 生成激活码、更新订单状态、发送邮件。
 * 作为 SKIP_PAYMENT 和真实支付回调的统一履约出口。
 */
export async function fulfillOrder(
  db: D1Database,
  order: { tradeNo: string; plan: Plan; deviceId: string; email: string },
  env: FulfillEnv,
): Promise<string> {
  const licenseKey = generateLicense(order.plan, order.deviceId, env.ED25519_PRIVATE_KEY)
  await markOrderPaid(db, order.tradeNo, licenseKey)

  if (isTrue(env.SKIP_EMAIL)) {
    console.log(`[DEV] ${order.email} → ${licenseKey}`)
    return licenseKey
  }

  try {
    await sendLicenseEmail({
      to: order.email,
      licenseKey,
      plan: order.plan,
      apiKey: env.RESEND_API_KEY,
      from: env.FROM_EMAIL,
      productName: env.PRODUCT_NAME,
    })
  } catch (err) {
    console.error(`邮件发送失败（激活码已落库 ${order.tradeNo}）:`, err)
  }

  return licenseKey
}
