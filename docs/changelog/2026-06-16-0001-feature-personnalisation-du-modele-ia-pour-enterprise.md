# 2026-06-16 — Feature : Personnalisation du modèle IA pour Enterprise (#70)

**Backend**

- `shared/types/plan.ts` — Ajout de `canCustomizeAI: boolean` dans `PlanQuotas` ; valeur `true` uniquement pour le plan Enterprise.
- Migration `1790000000000_add_ai_settings_to_organizations.ts` — Colonnes `ai_system_prompt` (text, nullable) et `ai_model_override` (varchar 100, nullable) sur la table `organizations`.
- `app/validators/user.ts` — `updateAiSettingsValidator` : `aiSystemPrompt` (max 2 000 car., nullable) + `aiModelOverride` (enum parmi `mistral-small-latest`, `mistral-medium-latest`, `mistral-large-latest`, nullable).
- `app/services/ai_analysis_service.ts` — `generateFleetAnalysis()` et `generateBoatSuggestions()` acceptent un `orgSystemPrompt?` optionnel qui est préfixé au prompt système existant.
- `app/controllers/ai_controller.ts` — Passe `user.organization.aiSystemPrompt` à chaque appel `generateFleetAnalysis` / `generateBoatSuggestions`.
- `app/controllers/settings_controller.ts` — Méthodes `ai()` (GET) et `updateAiSettings()` (PUT) ; redirection vers `/settings/billing` si le plan n'est pas Enterprise.
- `start/routes/settings.ts` — Routes `GET /settings/ai` (`settings.ai`) et `PUT /settings/ai` (`settings.ai.update`).

**Frontend**

- `inertia/components/settings/tabs/SettingsAiTab.vue` — Formulaire de configuration : textarea pour le prompt système, select pour le modèle.
- `inertia/pages/settings/ai.vue` — Page settings onglet IA.
- `inertia/components/settings/SettingsShell.vue` — Section « Personnalisation IA » visible uniquement si `PLAN_LIMITS[currentPlan].canCustomizeAI`.

**i18n** — Clés `settings.ai.*` et `settings.sections.ai` ajoutées (FR + EN). Message flash `settings.aiSettingsUpdated` ajouté (FR + EN).

---
