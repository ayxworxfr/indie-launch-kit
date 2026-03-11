import type { Plan } from '../types'
import { PLANS } from '../types'

/**
 * 通过 Resend 向用户发送包含激活码的 HTML 邮件。
 * 若发送失败会抛出异常，调用方负责决策是否影响主流程。
 */
export async function sendLicenseEmail(opts: {
  to: string
  licenseKey: string
  plan: Plan
  apiKey: string
  from: string
  productName: string
}): Promise<void> {
  const planConfig = PLANS[opts.plan]
  const durationText = planConfig.durationDays === null ? '永久有效' : `${planConfig.durationDays} 天`

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">${opts.productName}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">感谢你的购买！</p>
    </div>
    <div style="padding:40px">
      <p style="margin:0 0 6px;color:#374151;font-size:16px">
        你已成功开通 <strong>${planConfig.name}</strong>（${durationText}）
      </p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px">你的激活码如下，请妥善保存：</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center">
        <code style="font-size:18px;letter-spacing:2px;color:#1f2937;font-family:'Courier New',monospace;font-weight:700;word-break:break-all">${opts.licenseKey}</code>
      </div>
      <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px">
        <p style="margin:0 0 8px;color:#1d4ed8;font-size:14px;font-weight:600">如何激活？</p>
        <ol style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2">
          <li>打开 ${opts.productName} App</li>
          <li>进入「设置 → 账号 → 输入激活码」</li>
          <li>粘贴上方激活码，点击「激活」</li>
        </ol>
      </div>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.8">
        如遇问题请回复本邮件，我们会在 24 小时内回复。<br>
        激活码与你的设备绑定，请勿转发给他人。
      </p>
    </div>
  </div>
</body>
</html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: `【${opts.productName}】你的激活码已就绪`,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend 发送邮件失败: ${error}`)
  }
}
