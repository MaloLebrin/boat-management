import PasswordResetToken from '#models/password_reset_token'
import User from '#models/user'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

export default class PasswordResetService {
  async createToken(email: string): Promise<string | null> {
    const user = await User.findBy('email', email)
    if (!user) return null

    await PasswordResetToken.query().where('email', email).delete()

    const token = randomBytes(64).toString('hex')
    await PasswordResetToken.create({
      email,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    return token
  }

  async verifyToken(token: string): Promise<PasswordResetToken | null> {
    const record = await PasswordResetToken.findBy('token', token)
    if (!record) return null
    if (record.expiresAt < DateTime.now()) return null
    return record
  }

  async invalidateTokensForEmail(email: string): Promise<void> {
    await PasswordResetToken.query().where('email', email).delete()
  }
}
