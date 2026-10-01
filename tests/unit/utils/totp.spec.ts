import { test } from '@japa/runner'
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  otpauthUri,
  totpCode,
  totpStep,
  verifyTotp,
} from '#utils/totp'

// Secret des vecteurs de test de la RFC 6238 (annexe B), SHA-1.
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii')
const RFC_SECRET_B32 = base32Encode(RFC_SECRET)

test.group('TOTP (unit) — #884', () => {
  test('matches the RFC 6238 SHA-1 test vectors', ({ assert }) => {
    assert.equal(hotp(RFC_SECRET, totpStep(59_000), 8), '94287082')
    assert.equal(hotp(RFC_SECRET, totpStep(1_111_111_109_000), 8), '07081804')
    assert.equal(hotp(RFC_SECRET, totpStep(1_234_567_890_000), 8), '89005924')
    assert.equal(hotp(RFC_SECRET, totpStep(20_000_000_000_000), 8), '65353130')
  })

  test('base32 round-trips and tolerates case, spaces and padding', ({ assert }) => {
    assert.equal(RFC_SECRET_B32, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    assert.deepEqual(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq=='), RFC_SECRET)
    assert.throws(() => base32Decode('GE1!'))
  })

  test('generates a 160-bit base32 secret', ({ assert }) => {
    const secret = generateTotpSecret()
    assert.match(secret, /^[A-Z2-7]{32}$/)
    assert.lengthOf(base32Decode(secret), 20)
    assert.notEqual(secret, generateTotpSecret())
  })

  test('accepts the current code and its neighbours (window ±1)', ({ assert }) => {
    const at = 1_700_000_000_000
    const step = totpStep(at)
    assert.equal(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at), { atMs: at }), step)
    assert.equal(
      verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at - 30_000), { atMs: at }),
      step - 1
    )
    assert.equal(
      verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at + 30_000), { atMs: at }),
      step + 1
    )
  })

  test('rejects codes outside the window', ({ assert }) => {
    const at = 1_700_000_000_000
    assert.isNull(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at - 60_000), { atMs: at }))
    assert.isNull(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at + 60_000), { atMs: at }))
  })

  test('rejects malformed codes', ({ assert }) => {
    assert.isNull(verifyTotp(RFC_SECRET_B32, '12345'))
    assert.isNull(verifyTotp(RFC_SECRET_B32, 'abcdef'))
    assert.isNull(verifyTotp(RFC_SECRET_B32, '1234567'))
  })

  test('accepts spaces inside the code', ({ assert }) => {
    const at = 1_700_000_000_000
    const code = totpCode(RFC_SECRET_B32, at)
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
    assert.equal(verifyTotp(RFC_SECRET_B32, spaced, { atMs: at }), totpStep(at))
  })

  test('refuses a step already consumed (anti-replay)', ({ assert }) => {
    const at = 1_700_000_000_000
    const step = totpStep(at)
    const code = totpCode(RFC_SECRET_B32, at)
    assert.isNull(verifyTotp(RFC_SECRET_B32, code, { atMs: at, minStepExclusive: step }))
    assert.equal(verifyTotp(RFC_SECRET_B32, code, { atMs: at, minStepExclusive: step - 1 }), step)
    // Un code plus ancien que le dernier consommé est refusé aussi.
    const previous = totpCode(RFC_SECRET_B32, at - 30_000)
    assert.isNull(verifyTotp(RFC_SECRET_B32, previous, { atMs: at, minStepExclusive: step }))
  })

  test('builds an otpauth URI readable by authenticator apps', ({ assert }) => {
    const uri = otpauthUri({ secret: 'ABC', accountName: 'jo@example.com', issuer: 'FleetAi' })
    assert.equal(
      uri,
      'otpauth://totp/FleetAi%3Ajo%40example.com?secret=ABC&issuer=FleetAi&algorithm=SHA1&digits=6&period=30'
    )
  })
})
