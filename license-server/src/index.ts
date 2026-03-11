import { Hono } from 'hono'
import type { Env } from './types'
import orderRouter from './routes/order'
import callbackRouter from './routes/callback'
import { renderPage } from './ui'

const app = new Hono<{ Bindings: Env }>()

app.onError((err, c) => {
  console.error(err)
  return c.json({ ok: false, message: '服务器内部错误' }, 500)
})

app.get('/', c => c.html(renderPage(c.env.PRODUCT_NAME)))
app.route('/api', orderRouter)
app.route('/api', callbackRouter)

export default app
