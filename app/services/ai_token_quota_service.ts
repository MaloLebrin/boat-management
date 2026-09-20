import { QuotaExceededError } from '#exceptions/quota_errors'
import AiTokenUsage from '#models/ai_token_usage'
import type Organization from '#models/organization'
import AiTokenThresholdCrossed from '#events/ai_token_threshold_crossed'
import { PLAN_LIMITS, getUpgradeTier } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const NO_RESERVATION: AiTokenReservation = { amount: 0, release: async () => {} }

/**
 * Tokens réservés le temps d'un appel IA (#776).
 *
 * Un appel Mistral dure des dizaines de secondes et son coût n'est connu
 * qu'à la fin. La réservation forfaitaire est ce qui rend le plafond
 * opposable **pendant** l'appel : un second processus qui vérifie le quota au
 * même moment voit la réservation et se fait refuser.
 *
 * Dimensionnée petit devant le seul plafond existant (1 000 000 pour le plan
 * `pro`) : elle borne la course sans amputer le budget visible, et un
 * processus qui meurt en plein appel ne fuit que ce montant — voir
 * `reserveTokens`.
 */
export const AI_CALL_TOKEN_RESERVATION = 4_000

/**
 * Réservation en vol. `release()` est idempotent et ne lève jamais : il est
 * appelé depuis un `finally`, sur un chemin où l'erreur intéressante est
 * celle de l'appel IA, pas celle du décompte.
 */
export interface AiTokenReservation {
  /** Montant effectivement réservé — `0` quand le plan est illimité. */
  readonly amount: number
  release(): Promise<void>
}

@inject()
export default class AiTokenQuotaService {
  /** Queue de promesses par organisation — voir `withBestEffortOrgLock`. */
  readonly #orgLocks = new Map<number, Promise<void>>()

  /**
   * Réserve de quoi couvrir un appel IA, ou lève `QuotaExceededError`.
   *
   * Remplace le couple `getUsage()` + `assertCanUseTokens()` protégé par un
   * mutex en mémoire. Ce mutex était mono-processus — le fichier le
   * documentait comme une limite à lever « en cas de scale horizontal », mais
   * le repo lance déjà trois processus (serveur web, `queue:work`,
   * `queue:work:ai`) et les appels au quota partent des deux côtés. Chacun
   * avait sa `Map`, donc le plafond se contournait par course, sur une
   * fenêtre large comme un appel Mistral.
   *
   * La vérification tient maintenant dans **une seule opération atomique** :
   * un `INSERT … ON CONFLICT DO UPDATE … WHERE` dont le zéro-ligne-retournée
   * signifie « plafond atteint ». La base est la seule autorité, et le nombre
   * de processus n'a plus d'influence.
   *
   * ⚠️ Un processus tué en plein appel ne relâche pas sa réservation : elle
   * reste comptée jusqu'à la remise à zéro mensuelle
   * (`ResetAiTokenUsage`). La fuite est bornée à
   * `AI_CALL_TOKEN_RESERVATION` par appel interrompu, soit 0,4 % du plafond
   * `pro` — `clearReservations()` existe pour le rattrapage manuel.
   */
  async reserveTokens(org: Organization): Promise<AiTokenReservation> {
    const limit = PLAN_LIMITS[org.plan].aiTokensPerMonth
    if (limit === null) return NO_RESERVATION

    const month = this.currentMonthKey()
    // Un plafond plus petit que la réservation rendrait l'INSERT initial
    // (ligne absente, donc sans clause WHERE) faussement permissif.
    const amount = Math.min(AI_CALL_TOKEN_RESERVATION, limit)

    const result = await db.rawQuery<{ rowCount: number }>(
      `INSERT INTO ai_token_usages
         (organization_id, month, tokens_used, reserved_tokens, created_at, updated_at)
       VALUES (?, ?, 0, ?, NOW(), NOW())
       ON CONFLICT (organization_id, month)
       DO UPDATE SET reserved_tokens = ai_token_usages.reserved_tokens + ?,
                     updated_at = NOW()
       WHERE ai_token_usages.tokens_used + ai_token_usages.reserved_tokens + ? <= ?`,
      [org.id, month, amount, amount, amount, limit]
    )

    if (result.rowCount === 0) {
      throw new QuotaExceededError('ai_tokens', {
        limit,
        current: await this.getUsage(org.id, month),
        upgradeTo: getUpgradeTier(org.plan),
      })
    }

    return {
      amount,
      release: async () => {
        // `GREATEST` couvre le passage de mois entre la réservation et sa
        // libération : la ligne du mois suivant ne doit pas partir en négatif.
        await db
          .rawQuery(
            `UPDATE ai_token_usages
                SET reserved_tokens = GREATEST(reserved_tokens - ?, 0), updated_at = NOW()
              WHERE organization_id = ? AND month = ?`,
            [amount, org.id, month]
          )
          .catch(() => {})
      },
    }
  }

  /**
   * Réserve, exécute, relâche. C'est la forme que prennent tous les appels
   * IA émargés au quota : elle remplace le couple `withOrgLock` +
   * `getUsage` + `assertCanUseTokens` qui les précédait.
   */
  async withReservedTokens<T>(org: Organization, fn: () => Promise<T>): Promise<T> {
    const reservation = await this.reserveTokens(org)
    try {
      return await fn()
    } finally {
      await reservation.release()
    }
  }

  /**
   * Sérialisation par organisation **au sein d'un processus**, pour les
   * invariants qui ne passent pas par le compteur de tokens — aujourd'hui le
   * seul plafond de conversations à vie du plan starter.
   *
   * Volontairement laissée en mémoire, et donc best-effort : deux processus
   * peuvent encore franchir le compteur ensemble. Le dépassement coûte **une
   * conversation**, pas un budget Mistral, et la corriger demanderait de tenir
   * un verrou de base pendant tout un appel IA. Le quota de tokens, lui, ne
   * dépend plus de ce verrou (#776).
   */
  async withBestEffortOrgLock<T>(orgId: number, fn: () => Promise<T>): Promise<T> {
    const previous = this.#orgLocks.get(orgId) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    this.#orgLocks.set(
      orgId,
      previous.then(() => current)
    )
    await previous
    try {
      return await fn()
    } finally {
      release()
    }
  }

  /** Remet à zéro les réservations d'une organisation — rattrapage manuel. */
  async clearReservations(organizationId: number, month?: string): Promise<void> {
    await AiTokenUsage.query()
      .where('organizationId', organizationId)
      .where('month', month ?? this.currentMonthKey())
      .update({ reservedTokens: 0 })
  }

  currentMonthKey(): string {
    return DateTime.now().toFormat('yyyy-MM')
  }

  async getUsage(organizationId: number, month?: string): Promise<number> {
    const key = month ?? this.currentMonthKey()
    const row = await AiTokenUsage.query()
      .where('organizationId', organizationId)
      .where('month', key)
      .first()
    return row ? Number(row.tokensUsed) : 0
  }

  assertCanUseTokens(org: Organization, currentUsage: number): void {
    const limit = PLAN_LIMITS[org.plan].aiTokensPerMonth
    if (limit === null) return
    if (currentUsage >= limit) {
      throw new QuotaExceededError('ai_tokens', {
        limit,
        current: currentUsage,
        upgradeTo: getUpgradeTier(org.plan),
      })
    }
  }

  async recordUsage(org: Organization, tokensUsed: number): Promise<void> {
    if (tokensUsed <= 0) return

    const month = this.currentMonthKey()
    const limit = PLAN_LIMITS[org.plan].aiTokensPerMonth

    const result = await db.rawQuery<{ rows: [{ tokens_used: string }] }>(
      `INSERT INTO ai_token_usages (organization_id, month, tokens_used, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON CONFLICT (organization_id, month)
       DO UPDATE SET tokens_used = ai_token_usages.tokens_used + EXCLUDED.tokens_used,
                    updated_at = NOW()
       RETURNING tokens_used`,
      [org.id, month, tokensUsed]
    )

    if (limit !== null) {
      const newUsed = Number(result.rows[0].tokens_used)
      const oldUsed = newUsed - tokensUsed
      const oldPercent = (oldUsed / limit) * 100
      const newPercent = (newUsed / limit) * 100

      if (oldPercent < 80 && newPercent >= 80) {
        AiTokenThresholdCrossed.dispatch(org, 80)
      }
      if (oldPercent < 100 && newPercent >= 100) {
        AiTokenThresholdCrossed.dispatch(org, 100)
      }
    }
  }

  async resetMonth(month: string): Promise<void> {
    await AiTokenUsage.query().where('month', month).delete()
  }
}
