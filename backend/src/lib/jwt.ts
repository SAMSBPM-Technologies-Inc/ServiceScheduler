import { SignJWT, jwtVerify } from 'jose'

export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyToken(token: string, secret: string): Promise<Record<string, unknown>> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload as Record<string, unknown>
}
