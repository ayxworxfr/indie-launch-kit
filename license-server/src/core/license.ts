import { sign, etc } from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { concatBytes } from '@noble/hashes/utils'
import { fromBase64, toBase64Url } from '../utils'
import type { Plan } from '../types'

// @noble/ed25519 同步模式需要外部提供 SHA-512 实现
// 使用 @noble/hashes 确保在 Cloudflare Workers 中稳定运行
etc.sha512Sync = (...msgs: Uint8Array[]) => sha512(concatBytes(...msgs))

// 以下编码映射与 musiclab 的 features.dart / license_generator.dart 完全一致
const FEATURE_ENCODE: Record<string, string> = {
  all_courses: 'a',
  adv_practice: 'v',
  note_adv: 'n',
  sheet_edit: 'e',
  sheet_import: 's',
  sheet_export: 'x',
  grand_piano: 'g',
  multi_voice: 'm',
}

const PLAN_ENCODE: Record<Plan, string> = {
  monthly: 'm',
  yearly: 'y',
  lifetime: 'l',
  welfare: 'w',
}

const PLAN_PREFIX: Record<Plan, string> = {
  monthly: 'MON',
  yearly: 'YR',
  lifetime: 'PRO',
  welfare: 'WEL',
}

const PLAN_FEATURES: Record<Plan, string[]> = {
  monthly: ['all_courses', 'adv_practice', 'note_adv', 'sheet_edit', 'sheet_import'],
  yearly: ['all_courses', 'adv_practice', 'note_adv', 'sheet_edit', 'sheet_import', 'sheet_export', 'grand_piano'],
  lifetime: [
    'all_courses',
    'adv_practice',
    'note_adv',
    'sheet_edit',
    'sheet_import',
    'sheet_export',
    'grand_piano',
    'multi_voice',
  ],
  // welfare 不含 sheet_import，全功能体验版
  welfare: ['all_courses', 'adv_practice', 'note_adv', 'sheet_edit', 'sheet_export', 'grand_piano', 'multi_voice'],
}

const PLAN_DURATION_SECS: Partial<Record<Plan, number>> = {
  monthly: 30 * 86400,
  yearly: 365 * 86400,
}

/**
 * 生成 Ed25519 会员码，算法与 musiclab license_generator.dart 完全一致。
 *
 * 格式：PREFIX.PAYLOAD_BASE64URL.SIGNATURE_BASE64URL
 *
 * @param privateKeyBase64 32 字节 Ed25519 私钥种子，base64 编码（来自 musiclab tools/keys/private_key.txt）
 * @param welfareDays welfare 套餐专用，有效天数（7-30），其他套餐忽略此参数
 */
export function generateLicense(plan: Plan, deviceId: string, privateKeyBase64: string, welfareDays?: number): string {
  const now = Math.floor(Date.now() / 1000)

  let expireAt: number
  if (plan === 'welfare') {
    expireAt = now + (welfareDays ?? 30) * 86400
  } else {
    const durationSecs = PLAN_DURATION_SECS[plan]
    expireAt = durationSecs === undefined ? 0 : now + durationSecs
  }

  const payload: Record<string, unknown> = {
    f: PLAN_FEATURES[plan].map(f => FEATURE_ENCODE[f]),
    e: expireAt,
    p: PLAN_ENCODE[plan],
    i: now,
    d: deviceId,
  }

  const payloadStr = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const messageBytes = new TextEncoder().encode(payloadStr)
  const privateKeyBytes = fromBase64(privateKeyBase64)
  const signatureBytes = sign(messageBytes, privateKeyBytes)

  return `${PLAN_PREFIX[plan]}.${payloadStr}.${toBase64Url(signatureBytes)}`
}
