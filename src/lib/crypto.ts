import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')

export function encrypt(plaintext: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(payload: string) {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const text = buf.subarray(28)
  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(text), decipher.final()])
  return decrypted.toString('utf8')
}
