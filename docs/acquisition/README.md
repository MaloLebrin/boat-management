# Acquisition — Documentation complète

## Stratégie globale

L'acquisition repose sur un **tunnel simulateur → signup** : un visiteur sans compte découvre la valeur du produit en estimant le coût d'entretien de son bateau, puis est invité à s'inscrire avec un bateau pré-rempli.

Deux vecteurs complémentaires :

| Vecteur | Mécanisme | État |
|---|---|---|
| SEO organique | Page guide + simulateur public indexés sur requêtes coût entretien bateau | ✅ en place |
| Conversion visiteur | Tunnel simulateur → signup → bateau auto-créé | ✅ en place |
| Lead magnet | Capture email visiteur non prêt à s'inscrire | ✅ implémenté (2026-06-09) |
| CTA visuel | Réduire le poids du bouton "Recalculer" face à la CTA signup | ⬜ todo |
| Signup contextualisé | Bandeau "votre bateau sera ajouté" sur la page signup | ⬜ todo |

---

## Funnel complet

```
Trafic organique (SEO)
  └─ GET /fr/cout-entretien-bateau         (page guide)
       └─ CTA → simulateur public

GET /fr/simulateur-cout-entretien
  └─ Questionnaire multi-étapes (4–5 étapes)
       └─ Résultats + fourchette de coûts
            ├─ Visiteur prêt à s'inscrire
            │    └─ CTA "Créer mon compte"
            │         └─ POST /simulator/session  (sauvegarde en session)
            │              └─ Redirect /signup?from=simulator  [⬜ TODO]
            │                   └─ Bandeau contextuel "bateau sera ajouté"  [⬜ TODO]
            │                        └─ Inscription NewAccountController#store
            │                             └─ Bateau auto-créé depuis session
            │                                  └─ Redirect /boats/:id
            │
            └─ Visiteur non prêt (lead magnet)  [✅ implémenté]
                 └─ Formulaire email "Recevoir ce rapport"
                      └─ POST /simulator/lead
                           └─ Upsert SimulatorLead en base
                                └─ Confirmation inline
```

---

## Features implémentées

### 1. Simulateur public + tunnel signup ✅

Référence détaillée : [`docs/domain/simulator.md`](../domain/simulator.md)

- Page calculateur public (FR/EN) avec questionnaire multi-étapes
- Calcul côté frontend (`use_simulator_costs.ts`)
- Session AdonisJS → bateau auto-créé à l'inscription
- Utilisateur authentifié : CTA "Ajouter à ma flotte" → `POST /boats/from-simulator`

### 2. Page guide SEO ✅

- Routes : `GET /fr/cout-entretien-bateau`, `GET /en/boat-maintenance-cost`
- Sections : stats, tableau coûts, FAQ (FAQPage JSON-LD), CTA simulateur
- Lien dans le header et le footer public

### 3. Email capture simulateur (lead magnet) ✅

Implémenté le 2026-06-09.

#### Comportement

- Affiché uniquement aux visiteurs **non authentifiés** après les résultats
- Sous le CTA principal, séparé par un divider "ou"
- Après soumission : message de confirmation inline (pas de reload)
- Upsert sur l'email : pas de doublon si le visiteur simule plusieurs fois

#### Architecture

| Couche | Fichier | Rôle |
|---|---|---|
| Migration | `database/migrations/1786000000000_create_simulator_leads_table.ts` | Table `simulator_leads` |
| Model | `app/models/simulator_lead.ts` | Lucid model, UUID, pas de `updatedAt` |
| Service | `app/services/simulator_lead_service.ts` | `create()` — upsert sur email |
| Controller | `app/controllers/simulator_lead_controller.ts` | `store()` — valide, appelle service, redirect back |
| Validator | `app/validators/simulator_lead.ts` | VineJS `simulatorLeadValidator` |
| Route | `start/routes/marketing.ts` | `POST /simulator/lead` → `simulator.lead` (public) |
| Type | `shared/types/simulator.ts` | `SimulatorLeadPayload` |
| Composant | `inertia/components/marketing/simulator/SimulatorCtaCard.vue` | CTA + formulaire email |
| Tests | `tests/functional/simulator.spec.ts` | 3 tests fonctionnels Japa |

#### Schéma `simulator_leads`

```
id          UUID  PK  gen_random_uuid()
email       string(254)  NOT NULL  UNIQUE
boat_type   string  NOT NULL
length_m    integer  NOT NULL
hull_wear   string  NULLABLE
engine_wear string  NULLABLE
safety_wear string  NULLABLE
rigging_wear string NULLABLE
total_min   integer  NOT NULL
total_max   integer  NOT NULL
locale      string(10)  DEFAULT 'fr'
created_at  timestamp
```

#### Données stockées

- Identifiant : `email` (upsert — une ligne par email)
- Contexte simulation : type de bateau, longueur, états d'usure (coque/moteur/sécurité/gréement)
- Résultat : `total_min`, `total_max` (fourchette en euros)
- `locale` : pour personnaliser les futurs emails

#### Clés i18n

Namespace `simulator.*` dans `resources/lang/{fr,en}/simulator.json` :

| Clé | FR | EN |
|---|---|---|
| `cta_or_divider` | ou | or |
| `cta_email_title` | Recevoir ce rapport par email | Get this report by email |
| `cta_email_placeholder` | votre@email.com | your@email.com |
| `cta_email_button` | Envoyer | Send |
| `cta_email_success` | ✓ Rapport envoyé ! Vérifiez votre boîte. | ✓ Report sent! Check your inbox. |
| `cta_email_rgpd` | Vos données ne seront pas partagées. | Your data will not be shared. |

#### RGPD

- Mention de consentement affichée dans le formulaire (`cta_email_rgpd`)
- Pas d'envoi d'email automatique à ce stade
- La table `simulator_leads` servira de base à une future séquence nurturing

---

## Todos restants

### ⬜ CTA — Hiérarchie visuelle

Référence : [`todo-cta-visual-hierarchy.md`](todo-cta-visual-hierarchy.md)

**Problème** : le bouton "Recalculer" dans `SimulatorResultCard.vue` a le même poids visuel que la CTA signup — concurrence indésirable.

**Solution** : transformer le bouton "Recalculer" en lien texte discret.

```vue
<!-- avant -->
<button class="... border-2 border-bone bg-paper px-6 py-4 ...">

<!-- après -->
<button class="mt-4 w-full text-sm text-fg-subtle underline underline-offset-2 hover:text-fg transition-colors">
```

**Fichier** : `inertia/components/marketing/simulator/SimulatorResultCard.vue`  
**Impact** : CSS uniquement, aucun impact backend, aucune clé i18n.

---

### ⬜ Signup contextualisé après simulateur

Référence : [`todo-signup-contextualise.md`](todo-signup-contextualise.md)

**Problème** : la page `/signup` est générique — rien ne rappelle au visiteur que son bateau sera ajouté automatiquement.

**Solution** : passer `fromSimulator: boolean` depuis `SimulatorController#saveSession` via query param, lire la prop dans `signup.vue`, afficher un bandeau contextuel.

**Backend** (`app/controllers/simulator_controller.ts`) :
```ts
// avant
return response.redirect('/signup')

// après
return response.redirect('/signup?from=simulator')
```

**Backend** (`app/controllers/new_account_controller.ts`) :
```ts
async create({ inertia, request }: HttpContext) {
  const fromSimulator = request.qs().from === 'simulator'
  return inertia.render('auth/signup', { fromSimulator })
}
```

**Frontend** (`inertia/pages/auth/signup.vue`) :
```vue
<div v-if="fromSimulator" class="mb-6 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-fg">
  {{ t('auth.signup_from_simulator_notice') }}
</div>
```

**i18n à ajouter** dans `resources/lang/{fr,en}/auth.json` :

| Clé | FR | EN |
|---|---|---|
| `signup_from_simulator_notice` | ✓ Votre bateau sera ajouté automatiquement à votre compte dès votre inscription. | ✓ Your boat will be automatically added to your account upon registration. |

**Fichiers impactés** :
- `app/controllers/simulator_controller.ts`
- `app/controllers/new_account_controller.ts`
- `inertia/pages/auth/signup.vue`
- `resources/lang/fr/auth.json`
- `resources/lang/en/auth.json`

**Note** : la logique de création du bateau depuis la session reste inchangée — elle repose uniquement sur la présence de `simulatorBoat` en session, pas sur le param `from`.

---

## Ordre de priorité recommandé

1. **Hiérarchie CTA** (30 min) — impact immédiat, pur CSS, risque zéro
2. **Signup contextualisé** (2h) — réduit le drop-off sur la dernière étape du funnel

---

## Métriques à surveiller (futures)

- Taux de conversion visiteur simulateur → signup
- Taux de capture email (leads / visiteurs ayant vu les résultats)
- Taux de déduplication email (upserts / inserts)
- Drop-off entre page signup et complétion inscription
