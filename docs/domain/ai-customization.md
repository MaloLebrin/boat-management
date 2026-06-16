# Domaine — Personnalisation IA (Enterprise)

> Fonctionnalité réservée au plan **Enterprise**. Permet aux admins d'injecter un contexte métier personnalisé (prompt système) et de choisir le modèle Mistral utilisé par leur organisation.

---

## 1. Vue fonctionnelle

### Ce que ça fait

Un admin Enterprise peut configurer deux paramètres dans **Paramètres › Personnalisation IA** (`/settings/ai`) :

| Paramètre          | Description                                     | Contrainte               |
| ------------------ | ----------------------------------------------- | ------------------------ |
| **Prompt système** | Contexte métier préfixé à chaque requête IA     | max 2 000 car., nullable |
| **Modèle IA**      | Modèle Mistral utilisé à la place du défaut env | enum, nullable           |

Ces paramètres sont appliqués automatiquement sur **tous les échanges IA de l'organisation** : analyse de flotte, suggestions bateau, et chat (via queue).

### Qui peut y accéder

- **Plan Enterprise** uniquement — toute tentative d'accès depuis un plan inférieur redirige vers `/settings/billing`
- **Admins de l'organisation** uniquement — `OrganizationPolicy.configureAI()` + `before()` Bouncer

### Ce que voit un utilisateur Pro

L'onglet « Personnalisation IA » n'apparaît pas dans le nav settings. L'accès direct à `/settings/ai` redirige vers la page facturation.

---

## 2. Architecture

### 2.1 Flux de sauvegarde

```
Admin Enterprise
     │  PUT /settings/ai
     │  { aiSystemPrompt: "...", aiModelOverride: "mistral-large-latest" }
     ▼
SettingsController.updateAiSettings()
     │  1. PLAN_LIMITS[org.plan].canCustomizeAI  → redirect /settings/billing si false
     │  2. bouncer.authorize('configureAI')       → 403 si non-admin
     │  3. updateAiSettingsValidator              → validation + normalize "" → null
     │  4. org.aiSystemPrompt = ...
     │     org.aiModelOverride = ...
     │     org.save()
     ▼
organizations (DB)
     └─ ai_system_prompt  TEXT    nullable
     └─ ai_model_override VARCHAR nullable
```

### 2.2 Flux d'utilisation (analyse IA)

```
User (Enterprise)
     │  POST /ai/fleet-analysis  (ou /ai/boats/:id/suggestions)
     ▼
AiController.fleetAnalysis()
     │  await user.load('organization')
     │  quotaService.assertCanUseAI(org)
     ▼
AiAnalysisService.generateFleetAnalysis(
     userId,
     data,
     org.aiSystemPrompt,    ← null si non configuré
     org.aiModelOverride    ← null si non configuré
)
     │
     │  systemContent = orgSystemPrompt
     │    ? `${orgSystemPrompt}\n\n${SYSTEM_PROMPT}`
     │    : SYSTEM_PROMPT
     ▼
AiService.chat(messages, orgModelOverride)
     │  model = orgModelOverride ?? this.#model   ← env var AI_MODEL
     ▼
Mistral API
```

**Ordre du prompt système** : le prompt de l'organisation est préfixé **avant** le `SYSTEM_PROMPT` interne. Cela permet à l'organisation de poser son contexte métier en premier, les instructions de format restant en second.

---

## 3. Fichiers clés

| Fichier                                                                                                                                                | Rôle                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [`shared/types/plan.ts`](../../shared/types/plan.ts)                                                                                                   | `canCustomizeAI: boolean` dans `PlanQuotas` + `PLAN_LIMITS`          |
| [`shared/types/ai.ts`](../../shared/types/ai.ts)                                                                                                       | `AI_MODEL_OVERRIDES`, `AiModelOverride`                              |
| [`database/migrations/1790000000000_add_ai_settings_to_organizations.ts`](../../database/migrations/1790000000000_add_ai_settings_to_organizations.ts) | Colonnes `ai_system_prompt` + `ai_model_override`                    |
| [`database/schema.ts`](../../database/schema.ts)                                                                                                       | `OrganizationSchema` — colonnes déclarées                            |
| [`app/models/organization.ts`](../../app/models/organization.ts)                                                                                       | Modèle Lucid (hérite du schema)                                      |
| [`app/validators/user.ts`](../../app/validators/user.ts)                                                                                               | `updateAiSettingsValidator`                                          |
| [`app/services/ai_service.ts`](../../app/services/ai_service.ts)                                                                                       | `chat(messages, modelOverride?)`                                     |
| [`app/services/ai_analysis_service.ts`](../../app/services/ai_analysis_service.ts)                                                                     | `generateFleetAnalysis(..., orgSystemPrompt?, orgModelOverride?)`    |
| [`app/controllers/ai_controller.ts`](../../app/controllers/ai_controller.ts)                                                                           | Passe `aiSystemPrompt` + `aiModelOverride` aux calls                 |
| [`app/controllers/settings_controller.ts`](../../app/controllers/settings_controller.ts)                                                               | `ai()` + `updateAiSettings()`                                        |
| [`app/policies/organization_policy.ts`](../../app/policies/organization_policy.ts)                                                                     | `configureAI()` — retourne `false` (admins autorisés via `before()`) |
| [`start/routes/settings.ts`](../../start/routes/settings.ts)                                                                                           | `GET/PUT /settings/ai`                                               |
| [`inertia/pages/settings/ai.vue`](../../inertia/pages/settings/ai.vue)                                                                                 | Page Inertia                                                         |
| [`inertia/components/settings/tabs/SettingsAiTab.vue`](../../inertia/components/settings/tabs/SettingsAiTab.vue)                                       | Formulaire (textarea + select modèle)                                |
| [`inertia/components/settings/SettingsShell.vue`](../../inertia/components/settings/SettingsShell.vue)                                                 | Nav conditionnelle Enterprise                                        |

---

## 4. Base de données

### Table `organizations` — colonnes ajoutées

| Colonne             | Type           | Nullable | Défaut |
| ------------------- | -------------- | -------- | ------ |
| `ai_system_prompt`  | `TEXT`         | oui      | `NULL` |
| `ai_model_override` | `VARCHAR(100)` | oui      | `NULL` |

`NULL` signifie "utiliser le comportement par défaut" dans les deux cas :

- `ai_system_prompt NULL` → seul le `SYSTEM_PROMPT` interne est envoyé
- `ai_model_override NULL` → modèle issu de la variable d'env `AI_MODEL` (défaut : `mistral-small-latest`)

### Rollback

```ts
// down()
table.dropColumn('ai_system_prompt')
table.dropColumn('ai_model_override')
```

---

## 5. Validation

`updateAiSettingsValidator` (`app/validators/user.ts`) :

```ts
{
  aiSystemPrompt: vine.string().maxLength(2000).nullable().transform((v) => v || null),
  aiModelOverride: vine.enum(['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest']).nullable().optional(),
}
```

Points notables :

- **Transform `"" → null`** : une textarea vidée envoie `""`, qui serait stocké tel quel sans ce transform. Le transform garantit que la colonne reste à `NULL` quand le prompt est effacé.
- **`aiModelOverride` absent** : `.optional()` accepte les payloads sans la clé ; le controller normalise `undefined → null` via `?? null`.
- **Enum strict** : seuls les 3 modèles listés dans `AI_MODEL_OVERRIDES` (`shared/types/ai.ts`) sont acceptés.

---

## 6. ACL — OrganizationPolicy

```ts
// app/policies/organization_policy.ts

async before(user: User) {
  // Court-circuite pour les admins → autorisé sans appeler la méthode
  if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
    return true
  }
  // Retourne undefined pour les non-admins → méthode appelée
}

configureAI(_user: User): AuthorizerResponse {
  return false  // Non-admins refusés
}
```

**Séquence d'autorisation pour un admin :**

1. `before()` → retourne `true` → Bouncer autorise, `configureAI()` **non appelée**

**Séquence d'autorisation pour un membre :**

1. `before()` → retourne `undefined` → Bouncer appelle `configureAI()`
2. `configureAI()` → retourne `false` → **403**

Ce pattern est identique à `manageMembers()` — c'est la convention ACL du projet.

---

## 7. Modèles disponibles

Définis dans `shared/types/ai.ts` (source de vérité) :

| Valeur                  | Label UI       | Usage recommandé                    |
| ----------------------- | -------------- | ----------------------------------- |
| `mistral-small-latest`  | Mistral Small  | Requêtes courtes, réponses rapides  |
| `mistral-medium-latest` | Mistral Medium | Équilibre coût / qualité            |
| `mistral-large-latest`  | Mistral Large  | Analyse complexe, flotte importante |

Le modèle par défaut (sans override) est contrôlé par la variable d'env `AI_MODEL` (défaut `mistral-small-latest`).

---

## 8. Frontend

### Nav conditionnelle

`SettingsShell.vue` lit `page.props.currentPlan` (partagé par `InertiaMiddleware.share()`) et n'affiche l'onglet « Personnalisation IA » que si `PLAN_LIMITS[plan].canCustomizeAI === true`.

```ts
const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

const canCustomizeAI = computed(() => {
  const plan = page.props.currentPlan
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
  return PLAN_LIMITS[plan as PlanTier].canCustomizeAI
})
```

Le type guard évite un accès `PLAN_LIMITS[undefined]` sur les pages guest où `currentPlan` n'est pas défini.

### Formulaire

`SettingsAiTab.vue` — composant `<Form>` Inertia (`PUT /settings/ai`) :

- Textarea : `name="aiSystemPrompt"`, 6 lignes, max 2 000 car.
- Select : `name="aiModelOverride"`, option vide = modèle par défaut

L'URL hardcodée `/settings/ai` est conforme au pattern du reste des formulaires settings (`SettingsOrgTab.vue`, `SettingsMeTab.vue`) — le composant `<Form>` d'Inertia ne supporte pas les routes nommées.

### i18n

Clés dans `resources/lang/{fr,en}/settings.json` sous le namespace `settings.ai` :

| Clé                                    | Usage                           |
| -------------------------------------- | ------------------------------- |
| `settings.ai.title`                    | Titre de la section             |
| `settings.ai.description`              | Description sous le titre       |
| `settings.ai.systemPromptLabel`        | Label textarea                  |
| `settings.ai.systemPromptPlaceholder`  | Placeholder textarea            |
| `settings.ai.systemPromptHint`         | Hint "max 2 000 car."           |
| `settings.ai.modelOverrideLabel`       | Label select                    |
| `settings.ai.modelOverridePlaceholder` | Option vide (modèle par défaut) |
| `settings.ai.models.*`                 | Labels des 3 modèles            |
| `settings.ai.save`                     | Bouton de soumission            |
| `settings.sections.ai`                 | Label onglet dans le nav        |

Flash : `flash.settings.aiSettingsUpdated` (FR + EN).

---

## 9. Variables d'environnement

| Variable          | Rôle                                 | Défaut                 |
| ----------------- | ------------------------------------ | ---------------------- |
| `MISTRAL_API_KEY` | Clé API Mistral (obligatoire)        | —                      |
| `AI_MODEL`        | Modèle utilisé si aucun override org | `mistral-small-latest` |

L'override de l'organisation prend la priorité sur `AI_MODEL` mais ne remplace pas `MISTRAL_API_KEY` (toujours le compte de la plateforme).

---

## 10. Extension future

### Fine-tuning Mistral

La colonne `ai_model_override` accepte n'importe quel identifiant de modèle (varchar 100). Un modèle fine-tuné Mistral peut être référencé directement via cet identifiant sans modifier le code — il suffit d'élargir l'enum `AI_MODEL_OVERRIDES` dans `shared/types/ai.ts` et le validateur suit automatiquement.

Procédure Mistral fine-tuning :

1. Préparer un dataset JSONL au format `{ messages: [{role, content}] }`
2. Uploader via `mistral.files.upload()`
3. Créer un job : `mistral.fineTuning.jobs.create({ model, trainingFiles })`
4. Récupérer l'ID du modèle fine-tuné et l'ajouter à `AI_MODEL_OVERRIDES`

### Prompt par fonctionnalité

Actuellement, un seul prompt s'applique à toutes les analyses. Une évolution possible : prompt distinct par type d'analyse (`fleet_analysis`, `boat_suggestions`, `chat`) stocké dans une table `organization_ai_settings` dédiée.
