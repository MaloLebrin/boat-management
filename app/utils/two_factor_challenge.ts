import {
  TWO_FACTOR_CHALLENGE_TTL_MINUTES,
  TWO_FACTOR_PENDING_SESSION_KEY,
} from '#shared/constants/two_factor'
import type { TwoFactorPendingChallenge } from '#shared/types/two_factor'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

/**
 * État « pré-authentifié » entre le mot de passe et le second facteur (#884).
 *
 * Rien n'est ouvert côté `auth` tant que le code n'est pas validé : la session
 * ne porte que l'id du compte, le choix « se souvenir de moi » (appliqué
 * **après** le second facteur) et une échéance courte.
 */
export function beginTwoFactorChallenge(
  session: HttpContext['session'],
  userId: number,
  remember: boolean
): void {
  const pending: TwoFactorPendingChallenge = {
    userId,
    remember,
    expiresAt: DateTime.now().plus({ minutes: TWO_FACTOR_CHALLENGE_TTL_MINUTES }).toISO() ?? '',
  }
  session.put(TWO_FACTOR_PENDING_SESSION_KEY, pending)
}

/** L'état en cours, `null` s'il est absent, malformé ou expiré. */
export function readTwoFactorChallenge(
  session: HttpContext['session']
): TwoFactorPendingChallenge | null {
  const raw: unknown = session.get(TWO_FACTOR_PENDING_SESSION_KEY)
  if (typeof raw !== 'object' || raw === null) return null
  const { userId, remember, expiresAt } = raw as Record<string, unknown>
  if (typeof userId !== 'number' || typeof expiresAt !== 'string') return null

  const expires = DateTime.fromISO(expiresAt)
  if (!expires.isValid || expires <= DateTime.now()) {
    session.forget(TWO_FACTOR_PENDING_SESSION_KEY)
    return null
  }
  return { userId, remember: remember === true, expiresAt }
}

export function clearTwoFactorChallenge(session: HttpContext['session']): void {
  session.forget(TWO_FACTOR_PENDING_SESSION_KEY)
}
