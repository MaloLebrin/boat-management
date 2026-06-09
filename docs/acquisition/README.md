# Acquisition — Documentation complète

## Stratégie globale

L'acquisition repose sur un **tunnel simulateur → signup** : un visiteur sans compte découvre la valeur du produit en estimant le coût d'entretien de son bateau, puis est invité à s'inscrire avec un bateau pré-rempli.

Deux vecteurs complémentaires :

| Vecteur | Mécanisme | État |
|---|---|---|
| SEO organique | Page guide + simulateur public indexés sur requêtes coût entretien bateau | ✅ en place |
| Conversion visiteur | Tunnel simulateur → signup → bateau auto-créé | ✅ en place |
| Lead magnet | Capture email visiteur non prêt à s'inscrire | ✅ implémenté (2026-06-09) |
| CTA visuel | Réduire le poids du bouton "Recalculer" face à la CTA signup | ✅ implémenté (2026-06-09) |
| Signup contextualisé | Bandeau "votre bateau sera ajouté" sur la page signup | ✅ implémenté (2026-06-09) |


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
            │              └─ Redirect /signup?from=simulator  [✅]
            │                   └─ Bandeau contextuel "bateau sera ajouté"  [✅]
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

## Toutes les features sont implémentées ✅

Le tunnel d'acquisition complet est en place. Prochaines étapes envisageables :

- Séquence email nurturing sur les `simulator_leads`
- Métriques de conversion (voir section ci-dessous)

---

## Métriques à surveiller (futures)

- Taux de conversion visiteur simulateur → signup
- Taux de capture email (leads / visiteurs ayant vu les résultats)
- Taux de déduplication email (upserts / inserts)
- Drop-off entre page signup et complétion inscription
