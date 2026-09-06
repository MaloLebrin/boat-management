import { AiProviderKeyMissingError } from '#exceptions/ai_errors'
import type Organization from '#models/organization'
import OrganizationAiKey from '#models/organization_ai_key'
import { AI_PROVIDERS, modelBelongsToProvider, type AiProvider } from '#shared/types/ai'
import encryption from '@adonisjs/core/services/encryption'

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
 *   nouveau fournisseur est remis à null plutôt que laissé incohérent.
 */
export default class OrganizationAiKeyService {
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
      { apiKeyEncrypted: encryption.encrypt(apiKey) }
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

    // Une clé indéchiffrable (APP_KEY changée) ramène aussi au défaut app.
    const apiKey = encryption.decrypt<string>(key.apiKeyEncrypted)
    if (apiKey === null) return null

    return { provider: org.aiProvider, apiKey }
  }
}
