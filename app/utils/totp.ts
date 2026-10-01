import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { TOTP_DIGITS, TOTP_PERIOD_SECONDS, TOTP_WINDOW } from '#shared/constants/two_factor'

/**
 * TOTP (RFC 6238) sur HMAC-SHA1 — l'algorithme que lisent Google
 * Authenticator, 1Password, Authy, Bitwarden… (#884).
 *
 * Implémenté ici plutôt que via une dépendance : une trentaine de lignes au
 * dessus de `node:crypto`, testées contre les vecteurs de la RFC.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Base32 RFC 4648 sans padding — le format attendu dans `otpauth://`. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

/** Décode un secret base32 (casse, espaces et padding tolérés). */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Secret de 160 bits — la taille recommandée par la RFC 4226 pour SHA-1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** Pas de temps courant (compteur RFC 6238). */
export function totpStep(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS)
}

/** Code HOTP (RFC 4226) pour un compteur donné. */
export function hotp(secret: Buffer, counter: number, digits: number = TOTP_DIGITS): string {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', secret).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = digest.readUInt32BE(offset) & 0x7fffffff
  return String(binary % 10 ** digits).padStart(digits, '0')
}

/** Code TOTP à un instant donné (secret base32). */
export function totpCode(secret: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(secret), totpStep(atMs))
}

/**
 * Vérifie un code dans la fenêtre ±`TOTP_WINDOW` et rend le **pas** qui a
 * correspondu, `null` sinon.
 *
 * Rendre le pas (et pas un booléen) permet à l'appelant de refuser un code
 * déjà consommé : un pas n'est accepté que s'il est strictement postérieur
 * au dernier pas utilisé (`minStepExclusive`). Sans ça, un code intercepté
 * resterait rejouable pendant toute sa fenêtre de validité.
 */
export function verifyTotp(
  secret: string,
  code: string,
  options: { atMs?: number; minStepExclusive?: number | null } = {}
): number | null {
  const normalized = code.replace(/\s/g, '')
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(normalized)) return null

  const key = base32Decode(secret)
  const current = totpStep(options.atMs)
  const candidate = Buffer.from(normalized)
  let matched: number | null = null

  // Parcourt toute la fenêtre sans court-circuit : le temps de réponse ne
  // dit pas lequel des pas a correspondu.
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
    const step = current + delta
    const expected = Buffer.from(hotp(key, step))
    if (timingSafeEqual(expected, candidate) && matched === null) matched = step
  }

  if (matched === null) return null
  if (options.minStepExclusive !== null && options.minStepExclusive !== undefined) {
    if (matched <= options.minStepExclusive) return null
  }
  return matched
}

/** URI `otpauth://` lue par les applis (Key Uri Format). */
export function otpauthUri(params: { secret: string; accountName: string; issuer: string }) {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`)
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}
