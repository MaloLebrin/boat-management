import { PublicAiDailyBudgetExhaustedError } from '#exceptions/public_ai_budget_errors'
import PublicAiUsage from '#models/public_ai_usage'
import env from '#start/env'
import {
  PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY,
  PUBLIC_AI_DAILY_TOKEN_BUDGET,
  PUBLIC_AI_GLOBAL_CLIENT_KEY,
  PUBLIC_AI_GLOBAL_SURFACE,
  PUBLIC_AI_USAGE_RETENTION_DAYS,
  type PublicAiSurface,
} from '#shared/constants/public_ai_budget'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { createHmac } from 'node:crypto'

/**
 * Bornes de coût de la surface IA publique (#762).
 *
 * Les deux chats publics appellent Mistral de façon synchrone, avec la clé de
 * l'app, pour des visiteurs anonymes dont le coût n'est imputé à aucune
 * organisation. Le seul plafond par visiteur vivait dans la **session** :
 * vider ses cookies le remettait à zéro. Deux compteurs persistants le
 * remplacent :
 *
 * - **par IP et par jour**, sur les conversations ouvertes — ce que la
 *   session prétendait faire ;
 * - **global et par jour**, sur les tokens consommés — le seul garde-fou qui
 *   résiste à un pool d'IP résidentielles, contre lequel un plafond par IP ne
 *   peut rien.
 *
 * Les deux ne s'appliquent qu'aux **visiteurs anonymes**. Un utilisateur
 * connecté est identifié et déjà borné par son plan ; le lui appliquer en
 * plus le ferait dépendre du comportement d'inconnus partageant son IP.
 */
export default class PublicAiBudgetService {
  /**
   * Clé de compteur d'un visiteur : HMAC de l'IP salé par le jour.
   *
   * Jamais l'IP en clair — ce serait un journal d'adresses de visiteurs pour
   * une fonctionnalité qui n'en a pas besoin. Le sel journalier fait qu'une
   * même IP produit une clé différente chaque jour : les lignes ne se
   * recoupent pas d'un jour à l'autre, et la rétention n'a rien à rattraper.
   */
  clientKeyFor(ip: string, day = this.today()): string {
    return createHmac('sha256', env.get('APP_KEY').release())
      .update(`${day}|${ip}`)
      .digest('hex')
      .slice(0, 32)
  }

  /**
   * Réserve une conversation pour cette IP, ou lève.
   *
   * L'incrément et le test du plafond tiennent dans **une seule** instruction :
   * le `WHERE` de la branche `DO UPDATE` ne laisse passer que si le compteur
   * est encore sous la borne, et la contrainte d'unicité sérialise les
   * insertions concurrentes. Un `SELECT` suivi d'un `UPDATE` laisserait deux
   * requêtes simultanées franchir le plafond ensemble.
   *
   * Réserver **avant** l'appel au modèle : une conversation qui échoue ensuite
   * (réponse inexploitable) aura consommé son jeton. C'est le sens voulu — un
   * échec côté modèle coûte quand même un appel Mistral, et la borne compte
   * les appels, pas les succès.
   *
   * Rend `true` si la réservation est accordée.
   */
  async reserveConversation(surface: PublicAiSurface, ip: string): Promise<boolean> {
    const day = this.today()
    const result = await db.rawQuery<{ rows: Array<{ conversations: number }> }>(
      `INSERT INTO public_ai_usages (day, surface, client_key, conversations, tokens_used, created_at, updated_at)
       VALUES (?, ?, ?, 1, 0, NOW(), NOW())
       ON CONFLICT (day, surface, client_key)
       DO UPDATE SET conversations = public_ai_usages.conversations + 1,
                     updated_at = NOW()
       WHERE public_ai_usages.conversations < ?
       RETURNING conversations`,
      [day, surface, this.clientKeyFor(ip, day), PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY]
    )

    return result.rows.length > 0
  }

  /**
   * Lève si la surface publique a épuisé son budget de tokens du jour.
   *
   * Lecture puis décision, sans verrou : deux requêtes simultanées peuvent
   * toutes deux passer le dernier tour. Le dépassement est alors d'un appel,
   * sur un budget qui en autorise des centaines — le verrou coûterait plus
   * cher que ce qu'il éviterait. Ce qui compte est que le budget s'arrête, pas
   * qu'il s'arrête à la molécule près.
   */
  async assertDailyBudgetAvailable(): Promise<void> {
    const row = await this.#globalRow()

    if (row === null) {
      // Premier passage de la journée : c'est le seul moment où l'on sait
      // qu'aucune ligne du jour n'existe encore, donc le moment le moins cher
      // pour balayer les périmées. Pas de cron dédié pour une table dont
      // chaque ligne meurt en 24 h.
      await this.purgeExpired()
      return
    }

    if (row.tokensUsed >= PUBLIC_AI_DAILY_TOKEN_BUDGET) {
      throw new PublicAiDailyBudgetExhaustedError()
    }
  }

  /**
   * Comptabilise les tokens consommés, sur la ligne du visiteur **et** sur la
   * ligne agrégée.
   *
   * Ces tokens n'apparaissaient nulle part : `ai_token_usages` ne compte que
   * les organisations, et un anonyme n'en a pas. Sans mesure, on ne savait pas
   * ce que la surface publique coûtait réellement.
   */
  async recordTokens(surface: PublicAiSurface, ip: string, tokensUsed: number): Promise<void> {
    if (tokensUsed <= 0) return

    const day = this.today()
    await db.rawQuery(
      `INSERT INTO public_ai_usages (day, surface, client_key, conversations, tokens_used, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, NOW(), NOW()), (?, ?, ?, 0, ?, NOW(), NOW())
       ON CONFLICT (day, surface, client_key)
       DO UPDATE SET tokens_used = public_ai_usages.tokens_used + EXCLUDED.tokens_used,
                     updated_at = NOW()`,
      [
        day,
        surface,
        this.clientKeyFor(ip, day),
        tokensUsed,
        day,
        PUBLIC_AI_GLOBAL_SURFACE,
        PUBLIC_AI_GLOBAL_CLIENT_KEY,
        tokensUsed,
      ]
    )
  }

  /** Tokens consommés par la surface publique aujourd'hui, toutes IP confondues. */
  async tokensUsedToday(): Promise<number> {
    const row = await this.#globalRow()
    return row?.tokensUsed ?? 0
  }

  /** Supprime les compteurs au-delà de la rétention. Rend le nombre de lignes. */
  async purgeExpired(retentionDays = PUBLIC_AI_USAGE_RETENTION_DAYS): Promise<number> {
    const cutoff = DateTime.now().minus({ days: retentionDays }).toISODate()

    // `delete()` rend `[count]` sur PostgreSQL.
    const deleted = await PublicAiUsage.query().where('day', '<', cutoff!).delete()

    return Number(deleted[0] ?? 0)
  }

  /** Jour courant au format `YYYY-MM-DD`, la granularité du compteur. */
  today(): string {
    return DateTime.now().toISODate()!
  }

  async #globalRow(): Promise<PublicAiUsage | null> {
    return PublicAiUsage.query()
      .where('day', this.today())
      .where('surface', PUBLIC_AI_GLOBAL_SURFACE)
      .where('clientKey', PUBLIC_AI_GLOBAL_CLIENT_KEY)
      .first()
  }
}
