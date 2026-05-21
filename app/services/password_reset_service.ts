import PasswordResetToken from '#models/password_reset_token'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import hashService from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

@inject()
export default class PasswordResetService {
  async createToken(email: string): Promise<string | null> {
    const user = await User.findBy('email', email)
    if (!user) return null

    await PasswordResetToken.query().where('email', email).delete()

    const token = randomBytes(64).toString('hex')
    await PasswordResetToken.create({
      email,
      token: sha256(token),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    return token
  }

  async verifyToken(token: string): Promise<PasswordResetToken | null> {
    const tokenHash = sha256(token)
    const record = await PasswordResetToken.findBy('token', tokenHash)
    if (!record) return null

    // Defense-in-depth: constant-time comparison of stored vs computed hash
    const stored = Buffer.from(record.token, 'hex')
    const computed = Buffer.from(tokenHash, 'hex')
    if (stored.length !== computed.length || !timingSafeEqual(stored, computed)) return null

    if (record.expiresAt < DateTime.now()) return null
    return record
  }

  async invalidateTokensForEmail(email: string): Promise<void> {
    await PasswordResetToken.query().where('email', email).delete()
  }

  /**
   * Updates the password for a user by email.
   * Returns true if user was found and password updated, false otherwise.
   */
  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const user = await User.findBy('email', email)
    if (!user) return false

    user.password = await hashService.make(newPassword)
    await user.save()
    return true
  }
}
