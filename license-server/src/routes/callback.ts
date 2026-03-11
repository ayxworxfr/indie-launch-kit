import { Hono } from 'hono'
import type { Env, Plan } from '../types'
import { getOrderByTradeNo } from '../core/db'
import { fulfillOrder } from '../core/fulfillment'
import { verifyAlipayCallback } from '../services/alipay'

const router = new Hono<{ Bindings: Env }>()

router.post('/payment/callback', async c => {
  const body = (await c.req.parseBody()) as Record<string, string>

  const valid = await verifyAlipayCallback(body, c.env.ALIPAY_PUBLIC_KEY)
  if (!valid) return c.text('failure')

  // 只处理支付成功通知，其余状态告知支付宝已收到即可
  if (body.trade_status !== 'TRADE_SUCCESS') return c.text('success')

  const order = await getOrderByTradeNo(c.env.DB, body.out_trade_no)

  // 幂等：订单不存在或已处理，直接返回 success 防止支付宝持续重试
  if (!order || order.status === 'paid') return c.text('success')

  await fulfillOrder(
    c.env.DB,
    { tradeNo: order.trade_no, plan: order.plan as Plan, deviceId: order.device_id, email: order.email },
    c.env,
  )

  // 必须返回纯文本 success，否则支付宝会持续重试最多 25 次
  return c.text('success')
})

export default router
