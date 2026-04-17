// AES-256-GCM 암호화/복호화
// ENCRYPTION_KEY는 32바이트 base64 인코딩된 값이어야 함
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY not set')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error(`ENCRYPTION_KEY must be 32 bytes (got ${buf.length})`)
  return buf
}

export function encrypt(plaintext) {
  if (!plaintext) return null
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decrypt(encoded) {
  if (!encoded) return null
  const [ivB64, tagB64, ctB64] = encoded.split(':')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('invalid ciphertext format')
  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
  return plaintext.toString('utf8')
}

export function keyHint(plainKey) {
  if (!plainKey || plainKey.length < 8) return '****'
  return '****' + plainKey.slice(-4)
}
