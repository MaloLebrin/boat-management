# 2026-07-01 — [#194] Sécurité : correction race condition TOCTOU sur quota tokens IA

**Race condition (TOCTOU) corrigée dans la vérification du quota de tokens Mistral**

- `app/services/ai_token_quota_service.ts` : ajout de `withOrgLock<T>(orgId, fn)` — mutex async par organisation basé sur un chaînage de Promises. Deux requêtes simultanées du même org sont sérialisées : la seconde attend que la première termine (check + appel Mistral + `recordUsage`) avant de relire le quota.
- `app/services/ai_analysis_service.ts` : `generateFleetAnalysis` et `generateBoatSuggestions` enveloppent désormais la séquence `getUsage → assertCanUseTokens → chat → recordUsage` dans `withOrgLock`, ce qui empêche deux requêtes concurrentes de passer le check de quota simultanément.
- `tests/functional/quota/ai_token_quota.spec.ts` : 3 nouveaux tests — sérialisation des appels concurrents du même org, parallélisme toujours actif entre orgs différents, et vérification que le second appel concurrent est bien bloqué par `QuotaExceededError` quand le quota est dépassé par le premier.
