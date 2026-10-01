import type Organization from '#models/organization'
import TwoFactorRecoveryCode from '#models/two_factor_recovery_code'
import User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import DataEncryptionService from '#services/data_encryption_service'
import EmailQueueService from '#services/email_queue_service'
import PasswordResetService from '#services/password_reset_service'
import {
  TwoFactorAlreadyEnabledError,
  TwoFactorNotEnabledError,
  TwoFactorSetupMissingError,
} from '#exceptions/two_factor_errors'
import {
  RECOVERY_CODES_COUNT,
  TOTP_ISSUER,
  TWO_FACTOR_MAX_GRACE_DAYS,
} from '#shared/constants/two_factor'
import type {
  OrganizationTwoFactorPolicy,
  TwoFactorEnforcement,
  TwoFactorEvent,
  TwoFactorMethod,
  TwoFactorSetupData,
} from '#shared/types/two_factor'
import { generateTotpSecret, otpauthUri, verifyTotp } from '#utils/totp'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { createHash, randomInt } from 'node:crypto'
import QRCode from 'qrcode'

/** Alphabet des codes de secours : sans 0/o, 1/l/i — lisibles à la main. */
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const RECOVERY_HALF_LENGTH = 5

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex')
}

/** Casse, tirets et espaces ignorés : l'utilisateur recopie un papier. */
function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function generateRecoveryCode(): string {
  const pick = () =>
    Array.from(
      { length: RECOVERY_HALF_LENGTH },
      () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]
    ).join('')
  return `${pick()}-${pick()}`
}

/**
 * Double authentification TOTP (#884) : activation, codes de secours,
 * vérification au login et politique d'organisation.
 *
 * Le secret est chiffré au repos avec `ENCRYPTION_KEY` (même trousseau que les
 * clés BYOK, #786) ; les codes de secours sont hachés et à usage unique.
 */
@inject()
export default class TwoFactorService {
  constructor(
    private encryption: DataEncryptionService,
    private auditLogService: AuditLogService,
    private passwordResetService: PasswordResetService,
    private emailQueue: EmailQueueService
  ) {}

  // ---------------------------------------------------------------------------
  // Activation
  // ---------------------------------------------------------------------------

  /**
   * Démarre (ou redémarre) une activation : nouveau secret, pas encore actif.
   * Un secret en attente est remplacé — scanner un QR code périmé ne doit pas
   * pouvoir confirmer.
   */
  async beginSetup(user: User): Promise<TwoFactorSetupData> {
    if (user.hasTwoFactorEnabled) throw new TwoFactorAlreadyEnabledError()

    const secret = generateTotpSecret()
    user.twoFactorSecret = this.encryption.encrypt(secret)
    user.twoFactorConfirmedAt = null
    user.twoFactorLastUsedStep = null
    await user.save()

    return this.#setupData(user, secret)
  }

  /** Activation en cours, pour réafficher le QR code après un rechargement. */
  async pendingSetup(user: User): Promise<TwoFactorSetupData | null> {
    if (user.hasTwoFactorEnabled || !user.twoFactorSecret) return null
    const secret = this.#decryptSecret(user)
    return secret === null ? null : this.#setupData(user, secret)
  }

  /** Abandon d'une activation en cours. */
  async cancelSetup(user: User): Promise<void> {
    if (user.hasTwoFactorEnabled) return
    user.twoFactorSecret = null
    await user.save()
  }

  /**
   * Confirme l'activation avec un premier code. Rend les codes de secours en
   * clair (montrés une fois) et l'instant de révocation des autres sessions,
   * ou `null` si le code est faux.
   *
   * Activer la 2FA coupe les autres sessions et les remember-me (#763) : un
   * accès volé avant l'activation ne doit pas y survivre.
   */
  async confirmSetup(
    user: User,
    code: string
  ): Promise<{ recoveryCodes: string[]; validAfter: DateTime } | null> {
    if (user.hasTwoFactorEnabled) throw new TwoFactorAlreadyEnabledError()
    const secret = !user.twoFactorSecret ? null : this.#decryptSecret(user)
    if (secret === null) throw new TwoFactorSetupMissingError()

    const step = verifyTotp(secret, code)
    if (step === null) return null

    user.twoFactorConfirmedAt = DateTime.now()
    user.twoFactorLastUsedStep = step
    await user.save()

    const recoveryCodes = await this.#replaceRecoveryCodes(user)
    const validAfter = await this.passwordResetService.revokeAllAccess(user)

    await this.#audit(user, 'auth.2fa_enabled')
    await this.#notify(user, 'enabled')

    return { recoveryCodes, validAfter }
  }

  /**
   * Désactive la 2FA. Le mot de passe est vérifié par l'appelant ; le second
   * facteur (code de l'appli ou de secours) ici. `false` = code refusé.
   */
  async disable(user: User, code: string): Promise<boolean> {
    if (!user.hasTwoFactorEnabled) throw new TwoFactorNotEnabledError()
    const method = await this.verifyCode(user, code)
    if (method === null) return false

    user.twoFactorSecret = null
    user.twoFactorConfirmedAt = null
    user.twoFactorLastUsedStep = null
    await user.save()
    await TwoFactorRecoveryCode.query().where('userId', user.id).delete()

    await this.#audit(user, 'auth.2fa_disabled')
    await this.#notify(user, 'disabled')
    return true
  }

  /** Nouveau jeu de codes de secours (les anciens sont invalidés). */
  async regenerateRecoveryCodes(user: User, code: string): Promise<string[] | null> {
    if (!user.hasTwoFactorEnabled) throw new TwoFactorNotEnabledError()
    const method = await this.verifyCode(user, code)
    if (method === null) return null

    const recoveryCodes = await this.#replaceRecoveryCodes(user)
    await this.#audit(user, 'auth.2fa_recovery_regenerated')
    await this.#notify(user, 'recovery_regenerated')
    return recoveryCodes
  }

  async recoveryCodesRemaining(userId: number): Promise<number> {
    const row = await TwoFactorRecoveryCode.query()
      .where('userId', userId)
      .whereNull('usedAt')
      .count('* as total')
      .first()
    return Number(row?.$extras.total ?? 0)
  }

  // ---------------------------------------------------------------------------
  // Vérification
  // ---------------------------------------------------------------------------

  /**
   * Vérifie un second facteur et le **consomme** : un code TOTP n'est accepté
   * qu'une fois (pas strictement postérieur au dernier accepté), un code de
   * secours est marqué utilisé. Les deux écritures sont conditionnelles en
   * base : deux requêtes concurrentes avec le même code ne passent pas toutes
   * les deux.
   *
   * Un code à 6 chiffres est lu comme TOTP, tout le reste comme code de
   * secours.
   */
  async verifyCode(user: User, code: string): Promise<TwoFactorMethod | null> {
    if (!user.hasTwoFactorEnabled) return null
    const trimmed = code.replace(/\s/g, '')

    if (/^\d{6}$/.test(trimmed)) {
      const secret = this.#decryptSecret(user)
      if (secret === null) return null
      const step = verifyTotp(secret, trimmed, { minStepExclusive: user.twoFactorLastUsedStep })
      if (step === null) return null

      const updated = await db
        .from('users')
        .where('id', user.id)
        .where((query) => {
          query
            .whereNull('two_factor_last_used_step')
            .orWhere('two_factor_last_used_step', '<', step)
        })
        .update({ two_factor_last_used_step: step })
      if (Number(updated[0] ?? updated) !== 1) return null
      user.twoFactorLastUsedStep = step
      return 'totp'
    }

    if (normalizeRecoveryCode(trimmed).length !== RECOVERY_HALF_LENGTH * 2) return null
    const used = await db
      .from('two_factor_recovery_codes')
      .where('user_id', user.id)
      .where('code_hash', hashRecoveryCode(trimmed))
      .whereNull('used_at')
      .update({ used_at: DateTime.now().toJSDate() })
    if (Number(used[0] ?? used) !== 1) return null

    await this.#audit(user, 'auth.2fa_recovery_used', {
      remaining: await this.recoveryCodesRemaining(user.id),
    })
    await this.#notify(user, 'recovery_used')
    return 'recovery'
  }

  /** Second facteur refusé au login : tracé, sans le code saisi. */
  async logFailedChallenge(user: User): Promise<void> {
    await this.#audit(user, 'auth.2fa_failed')
  }

  // ---------------------------------------------------------------------------
  // Politique d'organisation
  // ---------------------------------------------------------------------------

  async organizationPolicy(organization: Organization): Promise<OrganizationTwoFactorPolicy> {
    const row = await db
      .from('organization_memberships')
      .join('users', 'users.id', 'organization_memberships.user_id')
      .where('organization_memberships.organization_id', organization.id)
      .whereNull('users.two_factor_confirmed_at')
      .count('* as total')
      .first()

    return {
      requireTwoFactor: organization.requireTwoFactor,
      graceEndsAt: organization.requireTwoFactor
        ? (organization.twoFactorGraceEndsAt?.toISO() ?? null)
        : null,
      membersWithoutTwoFactor: Number(row?.total ?? 0),
    }
  }

  /**
   * Active ou retire l'obligation. Le délai de grâce part de maintenant ;
   * réenregistrer une politique déjà active le recalcule.
   */
  async setOrganizationPolicy(
    organization: Organization,
    actor: User,
    params: { requireTwoFactor: boolean; graceDays: number }
  ): Promise<void> {
    const graceDays = Math.min(Math.max(Math.trunc(params.graceDays), 0), TWO_FACTOR_MAX_GRACE_DAYS)
    organization.requireTwoFactor = params.requireTwoFactor
    organization.twoFactorGraceEndsAt =
      params.requireTwoFactor && graceDays > 0 ? DateTime.now().plus({ days: graceDays }) : null
    await organization.save()

    await this.auditLogService.log({
      organizationId: organization.id,
      userId: actor.id,
      action: 'organization.2fa_required',
      entityType: 'organization',
      entityId: organization.id,
      metadata: {
        required: params.requireTwoFactor,
        graceDays: params.requireTwoFactor ? graceDays : null,
      },
    })
  }

  /** Ce que la politique de son organisation impose à `user`, maintenant. */
  async enforcementFor(user: User): Promise<TwoFactorEnforcement> {
    const none: TwoFactorEnforcement = { required: false, graceEndsAt: null, blocked: false }
    if (user.organizationId === null) return none

    // Relation chargée une fois par requête et partagée avec le middleware
    // Inertia (même mémoïsation que `inertia_middleware.ts`) : appelée depuis
    // `AuthMiddleware` sur chaque route authentifiée, une requête dédiée
    // doublerait la lecture de `organizations` sur chaque page.
    if (user.organization === undefined) await user.load('organization')
    const organization = user.organization
    if (!organization?.requireTwoFactor) return none

    const graceEndsAt = organization.twoFactorGraceEndsAt
    return {
      required: true,
      graceEndsAt: graceEndsAt?.toISO() ?? null,
      blocked: !user.hasTwoFactorEnabled && (graceEndsAt === null || graceEndsAt <= DateTime.now()),
    }
  }

  // ---------------------------------------------------------------------------

  #decryptSecret(user: User): string | null {
    if (!user.twoFactorSecret) return null
    const decrypted = this.encryption.decrypt(user.twoFactorSecret)
    if (decrypted === null) {
      // Clé de chiffrement perdue ou valeur corrompue : la 2FA ne peut plus
      // être vérifiée — c'est aux codes de secours de prendre le relais.
      logger.error({ userId: user.id }, 'TwoFactorService: unable to decrypt TOTP secret')
      return null
    }
    return decrypted.plainText
  }

  async #setupData(user: User, secret: string): Promise<TwoFactorSetupData> {
    const uri = otpauthUri({ secret, accountName: user.email, issuer: TOTP_ISSUER })
    const svg = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
    return {
      secret,
      otpauthUri: uri,
      qrCodeDataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    }
  }

  async #replaceRecoveryCodes(user: User): Promise<string[]> {
    const codes = Array.from({ length: RECOVERY_CODES_COUNT }, generateRecoveryCode)
    await db.transaction(async (trx) => {
      await TwoFactorRecoveryCode.query({ client: trx }).where('userId', user.id).delete()
      await TwoFactorRecoveryCode.createMany(
        codes.map((code) => ({ userId: user.id, codeHash: hashRecoveryCode(code) })),
        { client: trx }
      )
    })
    return codes
  }

  async #audit(
    user: User,
    action:
      | 'auth.2fa_enabled'
      | 'auth.2fa_disabled'
      | 'auth.2fa_recovery_used'
      | 'auth.2fa_recovery_regenerated'
      | 'auth.2fa_failed',
    metadata?: Record<string, unknown>
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

  /**
   * Prévient le titulaire du compte : si ce n'est pas lui qui a agi, c'est
   * le signal qu'il doit reprendre la main. Un échec d'envoi ne bloque pas
   * l'action.
   */
  async #notify(user: User, event: TwoFactorEvent): Promise<void> {
    try {
      await this.emailQueue.sendTwoFactorChanged({
        to: user.email,
        name: user.fullName,
        locale: user.locale,
        event,
      })
    } catch (err) {
      logger.warn({ err, userId: user.id, event }, 'TwoFactorService: notification failed')
    }
  }
}
