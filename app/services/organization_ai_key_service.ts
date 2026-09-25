import AiKeyUndecryptable from '#events/ai_key_undecryptable'
import { AiProviderKeyMissingError } from '#exceptions/ai_errors'
import type Organization from '#models/organization'
import OrganizationAiKey from '#models/organization_ai_key'
import DataEncryptionService from '#services/data_encryption_service'
import { AI_PROVIDERS, modelBelongsToProvider, type AiProvider } from '#shared/types/ai'
import type { AiKeyRotationOptions, AiKeyRotationReport } from '#shared/types/encryption'
import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

/**
 * Clés API IA par fournisseur (BYOK multi-fournisseurs, table
 * `organization_ai_keys`) et fournisseur actif (`organizations.ai_provider`).
 *
 * Invariants :
 * - la clé ne sort jamais du backend : `listConfigured` ne renvoie que des
 *   booléens, le déchiffrement n'a lieu qu'au moment d'un appel IA
 *   (`resolveActiveKey`) ;
 * - le fournisseur actif a toujours une clé : on ne peut pas sélectionner un
 *   fournisseur sans clé, et supprimer la clé du fournisseur actif ramène
 *   l'org au défaut de l'app (`ai_provider = null`, quota de tokens) ;
 * - `aiModelOverride` suit le fournisseur actif : un modèle étranger au
 *   nouveau fournisseur est remis à null plutôt que laissé incohérent ;
 * - le chiffrement au repos passe par `DataEncryptionService` (`ENCRYPTION_KEY`,
 *   #786), jamais par l'encrypteur par défaut lié à `APP_KEY`.
 */
@inject()
export default class OrganizationAiKeyService {
  constructor(private dataEncryption: DataEncryptionService) {}

  /** Booléens par fournisseur — seule forme qui sort du backend. */
  async listConfigured(organizationId: number): Promise<Record<AiProvider, boolean>> {
    const keys = await OrganizationAiKey.query()
      .where('organizationId', organizationId)
      .select('provider')

    const configured = new Set(keys.map((key) => key.provider))
    return Object.fromEntries(
      AI_PROVIDERS.map((provider) => [provider, configured.has(provider)])
    ) as Record<AiProvider, boolean>
  }

  /** Enregistre (ou remplace) la clé du fournisseur — chiffrée au repos. */
  async setKey(org: Organization, provider: AiProvider, apiKey: string): Promise<void> {
    await OrganizationAiKey.updateOrCreate(
      { organizationId: org.id, provider },
      { apiKeyEncrypted: this.dataEncryption.encrypt(apiKey) }
    )
  }

  /**
   * Supprime la clé du fournisseur. Si c'était le fournisseur actif, l'org
   * revient au défaut de l'app (et un `aiModelOverride` étranger à Mistral est
   * remis à null).
   */
  async removeKey(org: Organization, provider: AiProvider): Promise<void> {
    await OrganizationAiKey.query()
      .where('organizationId', org.id)
      .where('provider', provider)
      .delete()

    if (org.aiProvider === provider) {
      await this.setActiveProvider(org, null)
    }
  }

  /**
   * Sélectionne le fournisseur actif — refuse un fournisseur sans clé
   * (`AiProviderKeyMissingError`). `null` = clé Mistral de l'app + quota.
   */
  async setActiveProvider(org: Organization, provider: AiProvider | null): Promise<void> {
    if (provider !== null) {
      const key = await OrganizationAiKey.query()
        .where('organizationId', org.id)
        .where('provider', provider)
        .first()
      if (key === null) throw new AiProviderKeyMissingError(provider)
    }

    const effectiveProvider = provider ?? 'mistral'
    if (org.aiModelOverride && !modelBelongsToProvider(org.aiModelOverride, effectiveProvider)) {
      org.aiModelOverride = null
    }

    org.aiProvider = provider
    await org.save()
  }

  /**
   * Résolution pour l'assistant : `null` = défaut app (clé Mistral de l'app,
   * quota applicable) ; sinon la clé déchiffrée du fournisseur actif. Une
   * ligne manquante (état incohérent) ramène au défaut plutôt que d'échouer.
   *
   * Une clé indéchiffrable ramène aussi au défaut — mais jamais en silence
   * (#786) : `AiKeyUndecryptable` est émis, le repli sur la clé de l'app
   * transformerait sinon un incident de configuration en dérive de facturation.
   */
  async resolveActiveKey(
    org: Organization
  ): Promise<{ provider: AiProvider; apiKey: string } | null> {
    if (org.aiProvider === null) return null

    const key = await OrganizationAiKey.query()
      .where('organizationId', org.id)
      .where('provider', org.aiProvider)
      .first()
    if (key === null) return null

    const decrypted = this.dataEncryption.decrypt(key.apiKeyEncrypted)
    if (decrypted === null) {
      await emitter.emit(AiKeyUndecryptable, new AiKeyUndecryptable(org, org.aiProvider))
      return null
    }

    if (decrypted.keyring === 'app_key') {
      logger.warn(
        { organizationId: org.id, provider: org.aiProvider },
        'OrganizationAiKeyService: clé BYOK encore chiffrée avec APP_KEY — lancer `node ace encryption:rotate` pour terminer la migration vers ENCRYPTION_KEY'
      )
    }

    return { provider: org.aiProvider, apiKey: decrypted.plainText }
  }

  /**
   * Rechiffre toutes les clés BYOK avec la clé courante d'`ENCRYPTION_KEY`
   * (#786) — c'est l'étape « rechiffrer » d'une rotation, et la migration
   * initiale depuis `APP_KEY`. Idempotent : une ligne déjà à jour est
   * rechiffrée à l'identique (nouvel IV), sans effet. Une ligne qu'aucune clé
   * ne déchiffre est comptée et laissée telle quelle : la commande la signale,
   * l'admin de l'org devra ressaisir la clé.
   */
  async reencryptAll(options: AiKeyRotationOptions = {}): Promise<AiKeyRotationReport> {
    const dryRun = options.dryRun ?? false
    const keys = await OrganizationAiKey.query()
      .select('id', 'organizationId', 'provider', 'apiKeyEncrypted')
      .orderBy('id')

    const report: AiKeyRotationReport = {
      dryRun,
      total: keys.length,
      reencrypted: 0,
      fromAppKey: 0,
      undecryptable: 0,
    }

    for (const key of keys) {
      const decrypted = this.dataEncryption.decrypt(key.apiKeyEncrypted)
      if (decrypted === null) {
        report.undecryptable++
        logger.error(
          { organizationId: key.organizationId, provider: key.provider, aiKeyId: key.id },
          'encryption:rotate — clé BYOK indéchiffrable, laissée telle quelle'
        )
        continue
      }

      report.reencrypted++
      if (decrypted.keyring === 'app_key') report.fromAppKey++
      if (dryRun) continue

      key.apiKeyEncrypted = this.dataEncryption.encrypt(decrypted.plainText)
      await key.save()
    }

    return report
  }
}
