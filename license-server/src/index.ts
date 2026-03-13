import { Hono } from 'hono'
import type { Env, Plan } from './types'
import { VALID_PLANS } from './types'
import orderRouter from './routes/order'
import callbackRouter from './routes/callback'
import { renderPage } from './ui'

const app = new Hono<{ Bindings: Env }>()

app.onError((err, c) => {
  console.error(err)
  return c.json({ ok: false, message: '服务器内部错误' }, 500)
})

app.get('/', c => {
  const visiblePlans = (c.env.VISIBLE_PLANS ?? 'monthly,yearly,lifetime')
    .split(',')
    .map(s => s.trim() as Plan)
    .filter(s => VALID_PLANS.has(s))

  return c.html(renderPage({ productName: c.env.PRODUCT_NAME, visiblePlans }))
})

app.route('/api', orderRouter)
app.route('/api', callbackRouter)

export default app
