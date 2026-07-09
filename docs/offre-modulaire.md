# Offre modulaire FleetAi — Analyse & proposition

> **Statut** : proposition à arbitrer — aucun changement de code n'a été effectué.
> **Date** : 8 juillet 2026
> **Sources** : `shared/types/plan.ts`, `shared/types/permissions.ts`, `docs/billing-and-quotas.md`, `inertia/composables/use_nav_sections.ts`, `inertia/pages/marketing/pricing.vue`, `docs/changelog.md`

## 1. État de l'existant

FleetAi vend aujourd'hui **3 paliers** définis dans `shared/types/plan.ts` (`PLAN_LIMITS`, `PLAN_PRICES`) et facturés via Stripe (`stripe_service`, `subscription_service`) :

|                                          | Starter      | Pro                 | Enterprise                 |
| ---------------------------------------- | ------------ | ------------------- | -------------------------- |
| Prix mensuel                             | 0 €          | 20 € (16 € annuel)  | 99 € (79 € annuel)         |
| Bateaux / Membres / Stockage             | 2 / 1 / 1 Go | 25 / 5 / 20 Go      | Illimité                   |
| IA (`canUseAI`)                          | ✗            | ✓ (1 M tokens/mois) | ✓ + modèle personnalisable |
| Export CSV (`canExport`)                 | ✗            | ✓                   | ✓                          |
| Regroupement de tâches (`canGroupTasks`) | ✗            | ✓                   | ✓                          |
| Audit log                                | ✗            | 90 jours            | Illimité                   |
| CRM clients (`canManageClients`)         | ✗            | ✗                   | ✓                          |
| Tarification (`canManagePricing`)        | ✗            | ✗                   | ✓                          |
| Devis/Factures (`canManageInvoices`)     | ✗            | ✗                   | ✓                          |
| Marque blanche (`canWhiteLabel`)         | ✗            | ✗                   | ✓                          |

**Constat structurant** : l'architecture est déjà « modulaire dans les faits ». Les fonctionnalités différenciantes sont des **flags booléens** dans `PlanQuotas`, consommés par les policies backend, `quota_service` et la navigation frontend (`use_nav_sections.ts`). Passer d'un modèle « flags dérivés du tier » à « flags dérivés du tier + modules souscrits » est une évolution, pas une refonte.

**Problème du modèle actuel** : le saut Pro (20 €) → Enterprise (99 €) est brutal. Un loueur qui veut uniquement les contrats de location et la facturation doit payer 99 €/mois et reçoit aussi le CRM, la marque blanche et l'IA personnalisable dont il n'a pas besoin. Inversement, une marina n'a pas besoin de la facturation mais voudrait l'illimité. Le palier Enterprise agrège des besoins de personas différents.

## 2. Catalogue des fonctionnalités découpées en modules

Découpage proposé à partir des routes (`start/routes/`), de la navigation et des flags existants. Chaque module est un **ensemble cohérent vendable**, pas un simple écran.

### Socle commun (inclus dans toute offre, quotas variables selon le socle)

Le cœur du produit — le vendre en pièces détachées le tuerait :

- **Flotte** : bateaux, équipements (moteurs + pièces, voiles, gréement, sécurité, équipements génériques), documents & photos, documents administratifs avec alertes d'expiration
- **Maintenance** : planning (kanban + calendrier), historique filtrable, fiches d'entretien, tâches, actions équipement (achats/réparations), carnet d'entretien PDF
- **Budget** : postes de dépenses, escales, tableau de bord budget
- **Transverse** : dashboard + alertes, notifications (in-app + temps réel), membres & rôles (admin/member + capabilities), i18n FR/EN, simulateur de coût

### Modules candidats

| Module                 | Contenu                                                                                                                         | Flag existant                                      | Maturité                | Persona cible                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- | ------------------------------------- |
| **Navigation & Bord**  | Journal de bord, rôle d'équipage PDF, carburant, incidents, équipiers + certifications, mode offline PWA                        | _aucun_ (ouvert à tous aujourd'hui)                | ✅ codé, non gaté       | Propriétaires navigants, skippers pro |
| **Marina**             | Ports, pontons, mouillages, places, plan 2D interactif, tracking GPS/AIS                                                        | _aucun_ (ouvert à tous aujourd'hui)                | ✅ codé, non gaté       | Marinas, gestionnaires de ports       |
| **Location (Charter)** | Réservations, états des lieux avec photos (entrée/sortie), contrats PDF + signature, tarif par bateau, tarification saisonnière | partiel : `canManagePricing` (le reste est ouvert) | ✅ codé, gating partiel | Loueurs                               |
| **CRM Clients**        | Fiches clients, documents (permis, identité), blacklist, RGPD (consentement, anonymisation, export)                             | `canManageClients`                                 | ✅ codé et gaté         | Loueurs, marinas                      |
| **Facturation**        | Devis/factures, lignes, numérotation, conversion devis→facture, PDF + envoi email, création depuis réservation, relances retard | `canManageInvoices`                                | ✅ codé et gaté         | Loueurs, marinas                      |
| **Assistant IA**       | Chat IA, analyse de flotte, suggestions par bateau, quota tokens mensuel ; personnalisation du modèle en option supérieure      | `canUseAI`, `canCustomizeAI`, `aiTokensPerMonth`   | ✅ codé et gaté         | Tous (upsell transverse)              |
| **Marque blanche**     | Branding personnalisé, logo, white-label                                                                                        | `canWhiteLabel`                                    | ✅ codé et gaté         | Gestionnaires de flotte, revendeurs   |
| **Data & Conformité**  | Import/export CSV, audit log avec rétention                                                                                     | `canExport`, `auditLogRetentionDays`               | ✅ codé et gaté         | Organisations structurées             |

**Remarques de découpage** :

- **Navigation & Bord** et **Marina** sont aujourd'hui gratuits pour tous. Les monétiser en add-on = _retrait_ de fonctionnalité pour les comptes existants → grandfathering obligatoire (voir §5). Alternative : les laisser dans le socle et ne monétiser que les modules déjà gatés.
- **CRM + Facturation** vont naturellement ensemble pour un loueur (client → réservation → contrat → facture). Les vendre en bundle unique simplifie l'offre.
- **Data & Conformité** est un différenciateur de socle (Starter vs Pro) plus qu'un module vendable seul — recommandé de le laisser attaché aux socles.

## 3. Scénarios d'offres comparés

### Scénario A — Statu quo redécoupé (3 tiers, contenu réajusté)

Garder Starter/Pro/Enterprise, mais descendre certaines briques d'Enterprise vers Pro (ex. facturation en Pro) et/ou créer un palier intermédiaire « Business » à ~45 €.

- ✅ Zéro travail technique (changer des booléens dans `PLAN_LIMITS`), lisibilité maximale de l'offre
- ❌ Ne résout pas le problème de fond : les personas différents (loueur vs marina) continuent de payer pour des blocs inutiles ; 4 tiers = début de confusion sans la flexibilité du modulaire

### Scénario B — Hybride socles + modules add-ons ⭐ recommandé

**2 socles** portant les quotas + **modules activables** (sur Pro uniquement) + **Enterprise conservé comme bundle « tout inclus »**.

|                                         | Starter                   | Pro                          | Enterprise              |
| --------------------------------------- | ------------------------- | ---------------------------- | ----------------------- |
| Prix                                    | 0 €                       | 20 €/mois (16 € annuel)      | 99 €/mois (79 € annuel) |
| Quotas                                  | 2 bateaux, 1 membre, 1 Go | 25 bateaux, 5 membres, 20 Go | Illimité                |
| Socle commun                            | ✓                         | ✓                            | ✓                       |
| Data & Conformité                       | ✗                         | ✓ (audit 90 j)               | ✓ (audit illimité)      |
| Modules add-ons                         | —                         | à la carte ⬇                 | **tous inclus**         |
| IA personnalisable, support prioritaire | ✗                         | ✗                            | ✓                       |

Modules souscriptibles sur le socle Pro :

| Module                         | Prix indicatif /mois | Justification                                                              |
| ------------------------------ | -------------------- | -------------------------------------------------------------------------- |
| **Location (Charter)**         | 15 €                 | Forte valeur (contrats, états des lieux, saisons) ; cœur du persona loueur |
| **CRM + Facturation** (bundle) | 15 €                 | Indissociables dans le workflow loueur ; bundle simplifie l'offre          |
| **Assistant IA**               | 10 €                 | 1 M tokens/mois ; coût d'infra réel (Mistral) → prix couvre l'usage        |
| **Marina**                     | 10 €                 | Plan 2D + tracking AIS ; persona marina                                    |
| **Marque blanche**             | 15 €                 | Valeur B2B élevée, coût marginal nul                                       |

**Logique de prix** : Pro + tous les modules = 85 €/mois avec des quotas limités, contre Enterprise 99 € illimité + IA personnalisable + support. Chaque combinaison courante reste sous Enterprise, qui garde son rôle d'ancre « meilleure affaire » dès 3 modules :

| Persona                | Composition                      | Prix/mois | vs aujourd'hui            |
| ---------------------- | -------------------------------- | --------- | ------------------------- |
| Propriétaire           | Pro seul                         | 20 €      | =                         |
| Propriétaire navigant  | Pro + IA                         | 30 €      | 20 € (IA était incluse) ⚠ |
| Loueur                 | Pro + Location + CRM/Facturation | 50 €      | 99 € → **−49 €** 🎯       |
| Marina                 | Pro + Marina                     | 30 €      | 20 € ⚠                    |
| Gestionnaire de flotte | Enterprise                       | 99 €      | =                         |

- ✅ Chaque persona paie ce qu'il utilise ; le loueur (persona clé du marketing) passe de 99 € à 50 € → levée du frein d'adoption principal ; ARPU moyen probablement en hausse (les Pro à 20 € prennent 1-2 modules)
- ✅ S'appuie sur l'architecture existante (flags booléens déjà en place pour 5 modules sur 7)
- ❌ Travail Stripe réel (multi-items d'abonnement), page pricing à refondre, matrice de communication plus complexe
- ⚠ Deux cas de figure font _augmenter_ la facture vs aujourd'hui (IA sortie de Pro, Marina gatée) → à traiter par grandfathering ou en gardant l'IA de base dans Pro (variante : IA incluse dans Pro, seul le quota étendu est un add-on)

### Scénario C — 100 % à la carte (écarté)

Socle minimal unique, chaque domaine (maintenance, navigation, réservations, CRM…) facturé séparément.

- ❌ **Matrice de test combinatoire** : 8 modules = 256 combinaisons d'états possibles ; chaque interaction inter-modules (réservation → facture, inspection → action équipement) doit gérer l'absence de l'autre module
- ❌ **Tunnel d'achat confus** : l'utilisateur doit comprendre le découpage interne du produit avant de payer ; la friction cognitive tue la conversion self-service
- ❌ **ARPU imprévisible** et revenus fragmentés ; le socle seul cannibalise l'offre
- ❌ **Complexité Stripe/webhooks** : chaque module = un price + une logique de sync dans `subscription_service` ; les webhooks doivent réconcilier N items par abonnement
- ❌ Vendre la maintenance (le cœur) en module détruit la proposition de valeur « maintenance maritime sans douleur »

## 4. Recommandation

**Adopter le scénario B**, avec deux ajustements pour protéger l'existant :

1. **Garder l'IA de base dans Pro** (comme aujourd'hui, 1 M tokens). L'add-on IA devient « IA étendue » (quota supérieur, prélude au `canCustomizeAI` d'Enterprise). Aucun client Pro actuel ne perd rien.
2. **Ne pas gater Navigation & Bord ni Marina dans un premier temps** (ils restent dans le socle). Ce sont les modules les moins « gatables » (jamais restreints jusqu'ici) et les personas concernés sont ceux qu'on veut faire entrer. On pourra les monétiser plus tard sur les _nouvelles_ inscriptions si l'usage le justifie.

L'offre lancée en V1 serait donc : **Starter / Pro / Pro + Location (15 €) / Pro + CRM & Facturation (15 €) / Enterprise**. Deux modules seulement, tous deux déjà codés **et déjà gatés** (`canManagePricing`, `canManageClients`, `canManageInvoices`) → effort minimal, risque minimal, et c'est exactement le segment (loueurs) où le prix actuel de 99 € bloque.

### Points de vigilance

- **Grandfathering** : les organisations Enterprise actuelles gardent tout ; aucune fonctionnalité n'est retirée à un compte existant sans migration accompagnée.
- **Downgrade / résiliation d'un module** : perte d'accès → réutiliser le pattern de l'event `OrganizationPlanDowngraded` (listener existant) pour notifier et désactiver proprement. Les données restent en lecture (les factures émises restent consultables/exportables même module résilié — obligation légale).
- **Anti-contournement** : le gating doit rester appliqué côté backend (policies + services), jamais seulement dans la nav — c'est déjà le cas aujourd'hui.
- **Page pricing** : la grille publique (`inertia/pages/marketing/pricing.vue`) doit présenter 3 colonnes + une section « modules » — pas 5 colonnes, sinon retour à la confusion du scénario C.

## 5. Esquisse d'impact technique (informatif — non exécuté)

L'architecture actuelle s'y prête bien. Par lot, du moins cher au plus cher :

| Lot                      | Contenu                                                                                                                                                                                                                                                                                                                                      | Effort estimé |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **1. Modèle de données** | Notion `Module` (`shared/types/plan.ts`) : `type PlanModule = 'charter' \| 'crm_invoicing' \| …` ; colonne/table `organization_modules` ou champ JSON sur `subscriptions` ; helper `hasModule(org, module)` remplaçant progressivement les lectures directes de `PLAN_LIMITS[tier].canX`                                                     | 1-2 j         |
| **2. Enforcement**       | `quota_service` + policies : résoudre les flags via tier **ou** module souscrit (fonction unique de résolution, ex. `resolveEffectiveQuotas(org)` pour éviter toute divergence back/front, comme `PermissionService.sharedProps()` le fait pour les rôles) ; `use_nav_sections.ts` consomme le résultat au lieu de `PLAN_LIMITS` directement | 2-3 j         |
| **3. Stripe**            | Un price par module ; abonnement multi-items ; `stripe_service`/`subscription_service` : sync des items dans les webhooks, checkout avec add-ons, portail client                                                                                                                                                                             | 3-5 j         |
| **4. UI**                | Page pricing publique (grille + section modules), onglet Réglages > Facturation (activer/résilier un module, quotas), i18n EN+FR                                                                                                                                                                                                             | 2-3 j         |
| **5. Cycle de vie**      | Events downgrade/résiliation de module, grandfathering (flag `legacy_plan` ou modules offerts), emails transactionnels                                                                                                                                                                                                                       | 1-2 j         |

Total indicatif : **9 à 15 jours** pour la V1 recommandée (2 modules déjà gatés → le lot 2 est quasi gratuit pour eux, l'essentiel du coût est dans les lots 3 et 4).

**Ordre conseillé** : lancer d'abord la V1 avec les modules Location et CRM & Facturation, mesurer l'adoption 2-3 mois, puis décider d'étendre (IA étendue, Marque blanche) ou de simplifier.
