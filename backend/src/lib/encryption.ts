// AES-256-GCM encryption for sensitive values stored in the database.
// Requires ENCRYPTION_KEY Worker secret: a 32-byte value encoded as base64.
// Generate with: openssl rand -base64 32
//
// Backward-compat: encrypted values are prefixed with "enc:".
// Values without the prefix are treated as legacy plaintext and returned as-is.
// They will be encrypted the next time they are saved.

const ENC_PREFIX = 'enc:'

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function importKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', base64ToBytes(secret), { name: 'AES-GCM' }, false, [usage])
}

async function encryptValue(plaintext: string, secret: string): Promise<string> {
  const key = await importKey(secret, 'encrypt')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)
  return ENC_PREFIX + bytesToBase64(combined)
}

async function decryptValue(stored: string, secret: string): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) return stored // legacy plaintext — return as-is
  const combined = base64ToBytes(stored.slice(ENC_PREFIX.length))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const key = await importKey(secret, 'decrypt')
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(plaintext)
}

// Encrypt a value if ENCRYPTION_KEY is configured; store plaintext otherwise.
export async function maybeEncrypt(value: string | null | undefined, secret: string | undefined): Promise<string | null> {
  if (!value) return null
  if (!secret) return value
  return encryptValue(value, secret)
}

// Decrypt a value if ENCRYPTION_KEY is configured; return as-is otherwise.
export async function maybeDecrypt(stored: string | null | undefined, secret: string | undefined): Promise<string | null> {
  if (!stored) return null
  if (!secret) return stored
  return decryptValue(stored, secret)
}
