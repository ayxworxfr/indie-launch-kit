import type { Order, Plan } from '../types'

interface CreateOrderParams {
  tradeNo: string
  deviceId: string
  email: string
  plan: Plan
  amount: string
}

export async function createOrder(db: D1Database, params: CreateOrderParams): Promise<void> {
  await db
    .prepare(
      `INSERT INTO orders (trade_no, device_id, email, plan, amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      params.tradeNo,
      params.deviceId,
      params.email,
      params.plan,
      params.amount,
      new Date().toISOString(),
    )
    .run()
}

export async function getOrderByTradeNo(db: D1Database, tradeNo: string): Promise<Order | null> {
  return db
    .prepare('SELECT * FROM orders WHERE trade_no = ? LIMIT 1')
    .bind(tradeNo)
    .first<Order>()
}

export async function markOrderPaid(
  db: D1Database,
  tradeNo: string,
  licenseKey: string,
): Promise<void> {
  await db
    .prepare(`UPDATE orders SET status = 'paid', license_key = ? WHERE trade_no = ?`)
    .bind(licenseKey, tradeNo)
    .run()
}
