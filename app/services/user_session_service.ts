import User from '#models/user'
import UserSession from '#models/user_session'
import AuditLogService from '#services/audit_log_service'
import EmailQueueService from '#services/email_queue_service'
import {
  CannotRevokeCurrentSessionError,
  UserSessionNotFoundError,
} from '#exceptions/user_session_errors'
import {
  AUTH_SESSION_RECORD_KEY,
  SESSION_IDLE_DAYS,
  SESSION_RETENTION_DAYS,
  SESSION_TOUCH_INTERVAL_MINUTES,
} from '#shared/constants/auth'
import { DEMO_EMAIL } from '#shared/constants/demo'
import { deviceFingerprint, parseUserAgent } from '#shared/helpers/user_agent'
import type {
  SessionRecordStatus,
  SessionRequestInfo,
  UserSessionRow,
  UserSessionsSettingsProps,
} from '#shared/types/user_session'
import { takeIssuedRememberMeTokenId } from '#utils/tracked_remember_me_tokens_provider'
import { RememberMeToken } from '@adonisjs/auth/session'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const USER_AGENT_MAX_LENGTH = 512
/** Cookie du remember-me du guard `web` (`remember_<guard>`). */
const REMEMBER_ME_COOKIE = 'remember_web'

type SessionContext = Pick<HttpContext, 'request' | 'session'>

/**
 * Registre des sessions et appareils connectés (#885).
 *
 * Les sessions restent dans le store de `SESSION_DRIVER` (cookie en
 * production) : ce service ne fait que les **recenser** dans `user_sessions`.
 * La session porte l'identifiant de sa ligne (`AUTH_SESSION_RECORD_KEY`) ;
 * `SessionRegistryMiddleware` la contrôle à chaque requête, et une ligne
 * révoquée déconnecte la session à sa requête suivante.
 */
@inject()
export default class UserSessionService {
  constructor(
    private auditLogService: AuditLogService,
    private emailQueue: EmailQueueService
  ) {}

  /**
   * Le compte démo est partagé par tous les visiteurs : le recenser listerait
   * leurs IP les uns aux autres, et « déconnecter partout » couperait les
   * autres visiteurs. Il reste hors registre.
   */
  isTracked(user: Pick<User, 'email'>): boolean {
    return user.email !== DEMO_EMAIL
  }

  requestInfo(request: HttpContext['request']): SessionRequestInfo {
    const userAgent = request.header('user-agent') ?? null
    return {
      ipAddress: request.ip() || null,
      userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX_LENGTH) : null,
    }
  }

  currentId(session: HttpContext['session']): string | null {
    const id: unknown = session.get(AUTH_SESSION_RECORD_KEY)
    return typeof id === 'string' ? id : null
  }

  /**
   * Recense la session qui vient d'être ouverte par un login explicite
   * (connexion, inscription, démo) et prévient le titulaire si l'appareil est
   * inconnu.
   */
  async open(ctx: SessionContext, user: User, options: { notify: boolean }): Promise<void> {
    if (!this.isTracked(user)) return
    const info = this.requestInfo(ctx.request)
    const isNewDevice = options.notify && (await this.#isUnknownDevice(user.id, info.userAgent))

    const record = await this.#create(user.id, info, takeIssuedRememberMeTokenId(user))
    ctx.session.put(AUTH_SESSION_RECORD_KEY, record.id)

    if (isNewDevice && user.notifyNewLogin !== false) await this.#notifyNewLogin(user, info)
  }

  /**
   * Session authentifiée sans ligne : restaurée depuis un remember-me, ou
   * ouverte avant le déploiement du registre. Elle est rattachée à la ligne
   * de son remember-me quand il y en a une — c'est la même « connexion » qui
   * continue —, sinon recensée.
   */
  async adopt(ctx: SessionContext, user: User): Promise<void> {
    const info = this.requestInfo(ctx.request)
    const tokenId =
      takeIssuedRememberMeTokenId(user) ?? (await this.#incomingRememberMeTokenId(ctx, user.id))

    if (tokenId !== null) {
      const existing = await UserSession.query()
        .where('userId', user.id)
        .where('rememberMeTokenId', tokenId)
        .whereNull('revokedAt')
        .first()
      if (existing) {
        existing.lastSeenAt = DateTime.now()
        existing.ipAddress = info.ipAddress
        existing.userAgent = info.userAgent
        await existing.save()
        ctx.session.put(AUTH_SESSION_RECORD_KEY, existing.id)
        return
      }
    }

    const record = await this.#create(user.id, info, tokenId)
    ctx.session.put(AUTH_SESSION_RECORD_KEY, record.id)
  }

  /**
   * Contrôle de la session courante, à chaque requête authentifiée. Une
   * ligne absente ou révoquée vaut révocation. Une ligne d'un **autre**
   * utilisateur (`foreign`) signale une session qui a changé de compte sans
   * repasser par `open()` — elle est recensée à nouveau pour son titulaire
   * actuel : le contenu de la session n'est pas falsifiable, et couper ici
   * déconnecterait un login légitime. `last_seen_at` n'est réécrit qu'une
   * fois par intervalle.
   */
  async check(
    id: string,
    userId: number,
    request: HttpContext['request']
  ): Promise<SessionRecordStatus> {
    const record = await UserSession.find(id)
    if (!record || record.revokedAt !== null) return 'revoked'
    if (record.userId !== userId) return 'foreign'

    const threshold = DateTime.now().minus({ minutes: SESSION_TOUCH_INTERVAL_MINUTES })
    if (record.lastSeenAt < threshold) {
      const info = this.requestInfo(request)
      record.lastSeenAt = DateTime.now()
      record.ipAddress = info.ipAddress
      record.userAgent = info.userAgent
      await record.save()
    }
    return 'active'
  }

  /** Déconnexion explicite : la ligne est close, pas supprimée (historique d'appareils). */
  async end(id: string | null): Promise<void> {
    if (id === null) return
    await UserSession.query().where('id', id).whereNull('revokedAt').update({
      revokedAt: DateTime.now().toJSDate(),
    })
  }

  async settingsFor(user: User, currentId: string | null): Promise<UserSessionsSettingsProps> {
    if (!this.isTracked(user))
      return { sessions: [], orphanRememberedCount: 0, notifyNewLogin: false }
    const [sessions, orphanRememberedCount] = await Promise.all([
      this.listActive(user.id, currentId),
      this.#orphanRememberMeTokenIds(user.id).then((ids) => ids.length),
    ])
    return { sessions, orphanRememberedCount, notifyNewLogin: user.notifyNewLogin !== false }
  }

  /**
   * Sessions encore utilisables : non révoquées, et actives depuis moins que
   * la durée de vie d'une session — ou adossées à un remember-me valide, qui
   * la rouvrira.
   */
  async listActive(userId: number, currentId: string | null): Promise<UserSessionRow[]> {
    const now = DateTime.now()
    const rows = await db
      .from('user_sessions')
      .leftJoin('remember_me_tokens', (join) => {
        join
          .on('remember_me_tokens.id', '=', 'user_sessions.remember_me_token_id')
          .andOnVal('remember_me_tokens.expires_at', '>', now.toJSDate())
      })
      .where('user_sessions.user_id', userId)
      .whereNull('user_sessions.revoked_at')
      .where((query) => {
        query
          .where(
            'user_sessions.last_seen_at',
            '>',
            now.minus({ days: SESSION_IDLE_DAYS }).toJSDate()
          )
          .orWhereNotNull('remember_me_tokens.id')
      })
      .orderBy('user_sessions.last_seen_at', 'desc')
      .select(
        'user_sessions.id',
        'user_sessions.ip_address',
        'user_sessions.user_agent',
        'user_sessions.created_at',
        'user_sessions.last_seen_at',
        'remember_me_tokens.id as remember_id'
      )

    return rows.map((row) => ({
      id: String(row.id),
      device: parseUserAgent(row.user_agent),
      ipAddress: row.ip_address ?? null,
      createdAt: DateTime.fromJSDate(new Date(row.created_at)).toISO()!,
      lastSeenAt: DateTime.fromJSDate(new Date(row.last_seen_at)).toISO()!,
      isCurrent: row.id === currentId,
      remembered: row.remember_id !== null,
    }))
  }

  /** Coupe une session de l'utilisateur, et le remember-me qui la rouvrirait. */
  async revoke(user: User, id: string, currentId: string | null): Promise<void> {
    if (id === currentId) throw new CannotRevokeCurrentSessionError()
    const record = await UserSession.query()
      .where('id', id)
      .where('userId', user.id)
      .whereNull('revokedAt')
      .first()
    if (!record) throw new UserSessionNotFoundError()

    record.revokedAt = DateTime.now()
    await record.save()
    if (record.rememberMeTokenId !== null) {
      await User.rememberMeTokens.delete(user, record.rememberMeTokenId)
    }

    await this.#audit(user, 'auth.session_revoked', { device: parseUserAgent(record.userAgent) })
  }

  /**
   * « Déconnecter partout sauf ici » : toutes les autres lignes et tous les
   * autres remember-me, plus `sessionsValidAfter` pour les sessions ouvertes
   * avant le registre. L'appelant réestampille la session courante avec
   * l'instant rendu.
   */
  async revokeOthers(user: User, currentId: string | null): Promise<DateTime> {
    const current = currentId ? await UserSession.find(currentId) : null
    const keepTokenId = current?.userId === user.id ? current.rememberMeTokenId : null

    const revoked = await this.revokeAllExcept(user.id, currentId)

    const tokens = await User.rememberMeTokens.all(user)
    for (const token of tokens) {
      if (Number(token.identifier) === keepTokenId) continue
      await User.rememberMeTokens.delete(user, token.identifier)
    }

    const validAfter = DateTime.now()
    user.sessionsValidAfter = validAfter
    await user.save()

    await this.#audit(user, 'auth.logout_all', { sessions: revoked })
    return validAfter
  }

  /** Révoque les lignes de l'utilisateur, sauf `keepId`. Rend le nombre coupé. */
  async revokeAllExcept(userId: number, keepId: string | null): Promise<number> {
    const query = UserSession.query().where('userId', userId).whereNull('revokedAt')
    if (keepId !== null) query.whereNot('id', keepId)
    const result: unknown = await query.update({ revokedAt: DateTime.now().toJSDate() })
    // Postgres rend un nombre de lignes, d'autres clients un tableau.
    return Number(Array.isArray(result) ? result[0] : result) || 0
  }

  /** Remember-me valides rattachés à aucune ligne (émis avant le registre). */
  async revokeOrphanRememberMeTokens(user: User): Promise<number> {
    const ids = await this.#orphanRememberMeTokenIds(user.id)
    for (const id of ids) await User.rememberMeTokens.delete(user, id)
    if (ids.length > 0)
      await this.#audit(user, 'auth.session_revoked', { rememberMeTokens: ids.length })
    return ids.length
  }

  async setNotifyNewLogin(user: User, enabled: boolean): Promise<void> {
    user.notifyNewLogin = enabled
    await user.save()
  }

  /** Lignes inactives depuis plus que la rétention (job `purge_expired_tokens`). */
  async purgeStale(): Promise<number> {
    const cutoff = DateTime.now().minus({ days: SESSION_RETENTION_DAYS }).toJSDate()
    const deleted = await db.from('user_sessions').where('last_seen_at', '<', cutoff).delete()
    return Number(deleted)
  }

  // ---------------------------------------------------------------------------

  async #create(
    userId: number,
    info: SessionRequestInfo,
    rememberMeTokenId: number | null
  ): Promise<UserSession> {
    const now = DateTime.now()
    return UserSession.create({
      id: randomUUID(),
      userId,
      rememberMeTokenId,
      ipAddress: info.ipAddress,
      userAgent: info.userAgent,
      lastSeenAt: now,
      revokedAt: null,
    })
  }

  /**
   * Appareil jamais vu sur ce compte (navigateur + système) pendant la
   * rétention. La toute première connexion recensée ne compte pas : sans
   * historique, tout appareil serait « inconnu ».
   */
  async #isUnknownDevice(userId: number, userAgent: string | null): Promise<boolean> {
    const rows = await db.from('user_sessions').where('user_id', userId).select('user_agent')
    if (rows.length === 0) return false
    const fingerprint = deviceFingerprint(userAgent)
    return rows.every((row) => deviceFingerprint(row.user_agent) !== fingerprint)
  }

  async #incomingRememberMeTokenId(ctx: SessionContext, userId: number): Promise<number | null> {
    const value: unknown = ctx.request.encryptedCookie(REMEMBER_ME_COOKIE)
    const decoded = typeof value === 'string' ? RememberMeToken.decode(value) : null
    const id = decoded ? Number(decoded.identifier) : Number.NaN
    if (!Number.isInteger(id)) return null

    const token = await db
      .from('remember_me_tokens')
      .where('id', id)
      .where('tokenable_id', userId)
      .select('id')
      .first()
    return token ? id : null
  }

  async #orphanRememberMeTokenIds(userId: number): Promise<number[]> {
    const rows = await db
      .from('remember_me_tokens')
      .where('tokenable_id', userId)
      .where('expires_at', '>', DateTime.now().toJSDate())
      .whereNotExists((query) => {
        query
          .from('user_sessions')
          .whereColumn('user_sessions.remember_me_token_id', 'remember_me_tokens.id')
          .whereNull('user_sessions.revoked_at')
      })
      .select('id')
    return rows.map((row) => Number(row.id))
  }

  async #notifyNewLogin(user: User, info: SessionRequestInfo): Promise<void> {
    try {
      await this.emailQueue.sendNewLogin({
        to: user.email,
        name: user.fullName,
        locale: user.locale,
        device: parseUserAgent(info.userAgent),
        ipAddress: info.ipAddress,
      })
    } catch (err) {
      logger.warn({ err, userId: user.id }, 'UserSessionService: new login notification failed')
    }
  }

  async #audit(
    user: User,
    action: 'auth.session_revoked' | 'auth.logout_all',
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!user.organizationId) return
    await this.auditLogService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action,
      entityType: 'user',
      entityId: user.id,
      metadata,
    })
  }
}
