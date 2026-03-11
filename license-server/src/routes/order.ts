import { Hono } from 'hono'
import type { Env, Plan } from '../types'
import { PLANS, VALID_PLANS, isTrue } from '../types'
import { createOrder, getOrderByTradeNo } from '../core/db'
import { fulfillOrder } from '../core/fulfillment'
import { createAlipayOrder } from '../services/alipay'

const router = new Hono<{ Bindings: Env }>()

const DEVICE_ID_RE = /^[A-Z0-9.]{4,32}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface OrderBody {
  email: string
  deviceId: string
  plan: Plan
}

function parseOrderBody(raw: unknown): OrderBody | string {
  if (!raw || typeof raw !== 'object') return '请求格式错误'
  const { email, deviceId, plan } = raw as Record<string, unknown>

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return '邮箱格式不正确'
  if (typeof deviceId !== 'string' || !DEVICE_ID_RE.test(deviceId)) return '设备 ID 格式不正确，请在 App 中复制'
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan as Plan)) return '套餐类型不正确'

  return { email, deviceId, plan: plan as Plan }
}

router.post('/order/create', async c => {
  const raw = await c.req.json().catch(() => null)
  const body = parseOrderBody(raw)

  if (typeof body === 'string') {
    return c.json({ ok: false, message: body }, 400)
  }

  const { email, deviceId, plan } = body
  const tradeNo = `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  await createOrder(c.env.DB, {
    tradeNo,
    deviceId,
    email,
    plan,
    amount: PLANS[plan].price.toFixed(2),
  })

  if (isTrue(c.env.SKIP_PAYMENT)) {
    await fulfillOrder(c.env.DB, { tradeNo, plan, deviceId, email }, c.env)
    return c.json({ ok: true, tradeNo, qrCode: 'mock' })
  }

  const qrCode = await createAlipayOrder({
    tradeNo,
    plan,
    notifyUrl: `${c.env.WORKER_URL}/api/payment/callback`,
    appId: c.env.ALIPAY_APP_ID,
    privateKeyBase64: c.env.ALIPAY_PRIVATE_KEY,
  })

  return c.json({ ok: true, tradeNo, qrCode })
})

router.get('/order/status', async c => {
  const tradeNo = c.req.query('tradeNo')
  if (!tradeNo) return c.json({ ok: false, message: '缺少 tradeNo 参数' }, 400)

  const order = await getOrderByTradeNo(c.env.DB, tradeNo)
  if (!order) return c.json({ ok: false, message: '订单不存在' }, 404)

  if (order.status === 'paid') {
    return c.json({ status: 'paid', licenseKey: order.license_key })
  }
  return c.json({ status: 'pending' })
})

export default router
