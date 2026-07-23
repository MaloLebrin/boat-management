# Seeders

Quatre seeders dans `database/seeders/`, chacun avec un rôle distinct. `node ace db:seed` (sans `--files`) exécute **tous** les fichiers du dossier — utiliser `--files` pour n'en lancer qu'un.

| Fichier                           | Rôle                                                                 | Environnement         |
| --------------------------------- | -------------------------------------------------------------------- | --------------------- |
| `malo_seeder.ts`                  | Compte réel de l'utilisateur (pas une démo)                          | tous                  |
| `sandbox_seeder.ts`               | Démo générique "Marina Démo", réinitialisable                        | tous                  |
| `test_plans_seeder.ts`            | 3 orgs simples, une par plan tier                                    | `development`, `test` |
| `billing_module_states_seeder.ts` | Matrice exhaustive plans/abonnements/modules/quotas + données métier | `development`, `test` |

Tous sont **idempotents** : relancer un seeder ne crée jamais de doublon (recherche par email/nom/tag avant création).

---

## `malo_seeder.ts`

```
node ace db:seed --files database/seeders/malo_seeder.ts
```

À ne pas confondre avec une démo générique : ce seeder crée/complète le compte **réel** de l'exploitant du projet, identifié par les variables d'environnement `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`.env`). Il échoue si l'une des deux est absente.

Contenu (classe `MaloSeeder`), aligné le 21/07/2026 sur un dump réel de la DB de dev pour coller exactement à la situation actuelle du compte, "toutes entités confondues" :

- utilisateur + organisation via `UserService.signupWithOrganization` (réutilisé si déjà présent) ; plan mis à `enterprise` directement sur `organizations.plan` (pas d'abonnement Stripe, comme en réalité)
- un port ("Port de Test Audit", Marseille), créé une seule fois via `PortService.createForUser`
- un bateau ("3D" en local — le nom réel du bateau de l'utilisateur), équipement (moteur(s), voiles, gréement) créés seulement s'ils manquent
- 6 événements de maintenance historiques + 5 tâches planifiées associées, avec des **dates absolues littérales** reprises telles quelles de la DB réelle (pas de calcul relatif à `today` : une fois créées, ces dates ne bougent plus lors des prochaines exécutions — assumé pour rester fidèle à l'état réel)

Un second bateau ("Rhodes 21") existe parfois en base comme résidu d'une ancienne version du seeder (avant le renommage en "3D") — volontairement non reproduit ici, ce n'est pas une donnée métier réelle à préserver.

---

## `sandbox_seeder.ts`

```
node ace db:seed --files database/seeders/sandbox_seeder.ts
```

La vraie démo générique du produit, présentée aux visiteurs/prospects. Exporte `seedDemoData()`, réutilisée en dehors de `db:seed` :

- `app/services/demo_service.ts` (`DemoService.reset()` supprime puis recrée l'org démo ; `ensureExists()` la recrée si absente)
- `app/jobs/reset_demo_data.ts` (job de queue qui réinitialise périodiquement la démo)

Contenu :

- organisation `Marina Démo` (slug `marina-demo`, plan `pro`) et utilisateur `DEMO_EMAIL` (`demo@fleetai.app` par défaut, mot de passe `DEMO_PASSWORD` env ou `demo1234`) — voir `shared/constants/demo.ts`
- 5 bateaux typés (voiliers + bateaux à moteur), équipement adapté au type de propulsion
- 5 événements de maintenance par bateau (dates aléatoires dans une plage réaliste)
- 6 notifications de démo (`seedDemoNotifications`) couvrant sévérités/types variés (maintenance en retard, document expirant, équipement de sécurité expiré, membre rejoint, plan mis à niveau, quota de stockage), mélange lu/non-lu

---

## `test_plans_seeder.ts`

```
node ace db:seed --files database/seeders/test_plans_seeder.ts
```

Seeder de test minimal : une organisation par plan tier, sans toucher aux abonnements ni aux modules. Mot de passe commun `Password1!`.

| Compte                              | Plan                  | Contenu                                                                                                                                                                      |
| ----------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `malolebrin@gmail.com` (si présent) | passé en `enterprise` | —                                                                                                                                                                            |
| `starter@test.local`                | starter               | 2 bateaux (quota max atteint)                                                                                                                                                |
| `pro@test.local`                    | pro                   | 5 bateaux, 3 membres (`pro-alice@test.local` membre, `pro-charlie@test.local` admin, `pro-mecano@test.local` mécanicien) + 2 interventions ouvertes (1 en retard, 1 à venir) |
| `enterprise@test.local`             | enterprise            | 8 bateaux, 4 membres                                                                                                                                                         |

`pro-mecano@test.local` (rôle `mechanic`) sert à tester le dashboard dédié « Mes interventions » (#417) : les 2 interventions ouvertes de la Pro org ont un `dueAt` relatif à la date de seed (retard/à venir garantis).

À conserver stable : ces comptes sont utilisés ailleurs (tests manuels historiques). Ne pas y ajouter de nouvelles **matrices plan/abonnement/module** — voir `billing_module_states_seeder.ts` pour toute nouvelle matrice.

---

## `billing_module_states_seeder.ts`

```
node ace db:seed --files database/seeders/billing_module_states_seeder.ts
```

Le seeder le plus riche : matérialise chaque état de la matrice plan/abonnement/module affichée sur `/settings/billing` (cf. fix #402 sur les états des modules Enterprise/Pro), plus les données métier des domaines `charter`/`crm_invoicing` quand ces modules sont actifs. Mot de passe commun `Password1!`, tous les comptes en `@test.local`.

Le fichier `database/seeders/billing_module_states_seeder.ts` lui-même est volontairement mince (une classe `BaseSeeder` qui orchestre 4 fonctions) : toute la logique vit dans `database/seeders_support/billing_module_states/` — un dossier **frère** de `database/seeders/`, jamais scanné par `db:seed`. C'est une contrainte technique : `@adonisjs/lucid` scanne `database/seeders/` récursivement et essaie d'exécuter **chaque** fichier `.ts` trouvé comme un seeder, donc des fichiers "helpers" sans classe `BaseSeeder` casseraient `db:seed` s'ils étaient placés dans un sous-dossier de `database/seeders/`.

| Fichier de support              | Contenu                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts`                  | `TEST_PASSWORD`                                                                                                                                     |
| `org_helpers.ts`                | `ensureOwner`, `ensureTeamMember`, `ensureBoat`, `ensureBoats`                                                                                      |
| `subscription_helpers.ts`       | `ensureSubscription`                                                                                                                                |
| `module_helpers.ts`             | `ensureModule`, `ensureAddon`                                                                                                                       |
| `quota_helpers.ts`              | `ensureStorageUsed`, `ensureAiTokenUsage`                                                                                                           |
| `business_data_helpers.ts`      | `ensureClient`, `ensurePricingSeason`, `ensureReservation`, `ensureRentalContract`, `ensureInvoice`, `seedCharterAndCrmData`, `seedCharterOnlyData` |
| `seed_core_states.ts`           | états cœur #402 (§1 ci-dessous), retourne les orgs/users réutilisés par les données métier                                                          |
| `seed_subscription_statuses.ts` | statuts Stripe exhaustifs (§2)                                                                                                                      |
| `seed_quota_edge_cases.ts`      | cas limites de quota (§3)                                                                                                                           |
| `seed_module_business_data.ts`  | données métier charter/CRM (§4)                                                                                                                     |

### 1. États cœur du fix #402 (organizations)

| Org                                                                               | Plan       | Abonnement | Modules                                                              | État `/settings/billing` attendu                                             |
| --------------------------------------------------------------------------------- | ---------- | ---------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `starter-baseline@test.local`                                                     | starter    | aucun      | aucun                                                                | upsell (`proRequired`) sur tous les modules                                  |
| `pro-no-sub-admin@test.local` / `pro-no-sub-member@test.local` (même org)         | pro        | aucun      | aucun                                                                | admin → CTA `activateSubscription` ; membre → message `subscriptionRequired` |
| `pro-sub-active-admin@test.local` / `pro-sub-active-member@test.local` (même org) | pro        | actif      | aucun                                                                | admin → boutons activer/désactiver ; membre → message `adminOnly`            |
| `pro-sub-with-modules@test.local`                                                 | pro        | actif      | `charter` + `crm_invoicing` (`source: subscription`)                 | boutons "désactiver" visibles                                                |
| `pro-granted-module@test.local`                                                   | pro        | actif      | `charter` (`source: granted`) seul                                   | `charter` → "inclus dans l'offre" sans CTA ; `crm_invoicing` → CTA activer   |
| `pro-addon-subscription@test.local`                                               | pro        | actif      | `extra_boats` ×3 (`subscription`)                                    | quota `maxBoats` effectif 8+3=11                                             |
| `pro-addon-granted@test.local`                                                    | pro        | actif      | `extra_boats` ×2 (`granted`)                                         | quota `maxBoats` effectif 10                                                 |
| `enterprise-baseline@test.local`                                                  | enterprise | aucun      | **aucune ligne** `organization_modules`                              | tous modules "inclus", aucun CTA (Enterprise n'a pas besoin de ligne)        |
| `enterprise-granted@test.local`                                                   | enterprise | aucun      | `charter` + `crm_invoicing` (`granted`, mirroring du grandfathering) | idem, vérifie la coexistence tier + lignes `granted`                         |

### 2. Statuts d'abonnement Stripe exhaustifs

`SubscriptionService.getActive()` (`app/services/subscription_service.ts`) ne considère `active`/`trialing`/`past_due` comme "abonnement actif" — c'est la seule chose renvoyée au front. Les 4 autres statuts créent une ligne `subscriptions` en base mais s'affichent comme "pas d'abonnement" sur `/settings/billing` (utile pour QA d'autres écrans : historique de facturation, réconciliation webhook).

| Org                                     | Statut               | Plan résultant                                                              |
| --------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `pro-sub-trialing@test.local`           | `trialing`           | pro (compté actif)                                                          |
| `pro-sub-past-due@test.local`           | `past_due`           | pro (compté actif, badge warning)                                           |
| `pro-sub-canceled@test.local`           | `canceled`           | **starter** (reflète la vraie règle métier : annulation → retour à starter) |
| `pro-sub-incomplete@test.local`         | `incomplete`         | pro                                                                         |
| `pro-sub-incomplete-expired@test.local` | `incomplete_expired` | pro                                                                         |
| `pro-sub-unpaid@test.local`             | `unpaid`             | pro                                                                         |
| `pro-sub-paused@test.local`             | `paused`             | pro                                                                         |

### 3. Cas limites de quota (plan Pro)

| Org                                   | Cas                                         |
| ------------------------------------- | ------------------------------------------- |
| `pro-quota-storage-80@test.local`     | stockage à 80 % du quota Pro (20 Go)        |
| `pro-quota-storage-100@test.local`    | stockage au-delà du quota Pro (102 %)       |
| `pro-quota-ai-near-limit@test.local`  | 85 % du quota mensuel de tokens IA Pro (1M) |
| `pro-quota-boats-at-limit@test.local` | exactement 8 bateaux (plafond Pro)          |

### 4. Données métier des modules actifs (charter/CRM)

Pour les organisations où `charter` et/ou `crm_invoicing` sont effectivement actifs (voir tableau §1), le seeder peuple aussi les domaines métier correspondants — sinon ces modules resteraient "activés" mais vides :

| Org                               | `charter` (pricing/réservations) | `crm_invoicing` (clients/factures)                                                  |
| --------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `pro-sub-with-modules@test.local` | ✅                               | ✅                                                                                  |
| `pro-granted-module@test.local`   | ✅                               | ❌ (module inactif — sert à vérifier que `/clients` et `/invoices` restent bloqués) |
| `enterprise-baseline@test.local`  | ✅                               | ✅                                                                                  |
| `enterprise-granted@test.local`   | ✅                               | ✅                                                                                  |

Pour chaque org avec `charter` actif :

- une fiche tarifaire (`BoatPricingService.upsert`) sur son premier bateau
- une saison haute (`PricingSeasonService.create`, multiplicateur, juillet-août)
- 2 réservations (`BoatReservationService.create`) : une confirmée, une en option
- un contrat de location (`RentalContractService.createForReservation`) pour la réservation confirmée

Pour chaque org avec `crm_invoicing` actif en plus :

- 2 clients (`ClientService.create`) : un actif ("Marc Dupuis"), un inactif ("Sophie Renard") — la réservation confirmée référence l'email de Marc, ce qui permet à `RentalContractService`/`InvoiceService` de le relier automatiquement (résolution par email, pas de FK directe)
- un devis (`kind: 'quote'`) et une facture (`kind: 'invoice'`, liée à la réservation confirmée), via `InvoiceService.create` — jamais de création directe d'`Invoice`/`InvoiceLine`/`invoice_counters` (numérotation séquentielle gap-free gérée par le service)

Comme `InvoiceService.create` alloue toujours un nouveau numéro (`DEV-000001`, `FAC-000001`...), l'idempotence des factures est assurée par un tag stable stocké dans `notes` (`seed:<org>:quote-1` / `seed:<org>:invoice-1`), vérifié avant toute création.

---

## Conventions communes à tous les seeders

- Jamais `new Model()` : `Model.create()` / `.updateOrCreate()` / `.firstOrCreate()`, ou service applicatif obtenu par DI (`app.container.make(XxxService)`) — jamais de logique métier dupliquée hors service (ex. `organization_modules` : uniquement via `OrganizationModuleService`, jamais en écriture directe sur le modèle).
- Idempotence : chercher l'existant (par email, nom, tag) avant de créer — un seeder doit pouvoir être relancé sans erreur ni doublon.
- `test_plans_seeder.ts` et `billing_module_states_seeder.ts` sont restreints à `development`/`test` (`static environment = [...]`) — jamais exécutables accidentellement en production.
