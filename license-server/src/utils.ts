/** Uint8Array → Base64Url 字符串（无 = 填充，与 musiclab 格式一致）*/
export function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Base64 / Base64Url 字符串 → Uint8Array */
export function fromBase64(base64: string): Uint8Array {
  const b64 = base64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}
