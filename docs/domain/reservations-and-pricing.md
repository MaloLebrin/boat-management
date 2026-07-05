# Domaine — Réservations & Tarification

> Documentation consolidée du module **réservations** de bateaux et de son
> **système de tarification** (tarif de base, périodes saisonnières, calcul
> automatique du total). Couvre les epics #107 (réservations) et #284
> (tarification & saisonnalité — lots #292, #293, #294).

---

## 1. Objectif fonctionnel

Permettre à une entreprise de location/charter de :

1. **Réserver un bateau** sur une période (option puis confirmation), avec un
   client saisi en texte libre, un statut et un prix total.
2. **Définir des tarifs** : un tarif de base par bateau (jour / semaine,
   caution, durées mini/maxi) et des **périodes saisonnières** (globales ou par
   bateau) qui ajustent le prix journalier.
3. **Calculer automatiquement** le total d'une réservation à partir de ces
   règles, pré-remplir le champ prix (modifiable) et signaler les durées hors
   bornes.

La **tarification est une fonctionnalité du plan Enterprise** (gating
`canManagePricing`). Les réservations, elles, sont disponibles pour toute
organisation ; le calcul automatique ne s'active que si un tarif de base est
configuré sur le bateau.

---

## 2. Vue d'ensemble / architecture

```
                         ┌─────────────────────────────┐
  Réservation (dates) ─▶ │  computeReservationQuote()   │ ─▶ total, détail,
                         │  shared/helpers/             │    caution, bornes
   boat_pricing ───────▶ │  reservation_quote.ts (PURE) │
   pricing_seasons ────▶ │                              │
                         └─────────────────────────────┘
                                  ▲            ▲
              backend (auto-fill / │            │ frontend (estimation live)
               enforcement bornes) │            │  ReservationQuoteCard.vue
```

Le **cœur de calcul est une fonction pure partagée** (`#shared/helpers/
reservation_quote`), appelée **à l'identique** par le backend (pour
pré-remplir `total_price` et faire respecter les bornes) et par le frontend
(estimation en direct dans le formulaire). Une seule source de vérité, testée
unitairement.

| Lot              | Issue | Objet                       | Table                     |
| ---------------- | ----- | --------------------------- | ------------------------- |
| Réservations     | #107  | CRUD réservation par bateau | `boat_reservations`       |
| Tarification 1/3 | #292  | Tarif de base par bateau    | `boat_pricing`            |
| Tarification 2/3 | #293  | Périodes saisonnières       | `pricing_seasons`         |
| Tarification 3/3 | #294  | Calcul automatique du total | _(aucune — logique pure)_ |

---

## 3. Modèle de données

### 3.1 `boat_reservations`

Modèle : `app/models/boat_reservation.ts`.

| Colonne                         | Type               | Notes                                        |
| ------------------------------- | ------------------ | -------------------------------------------- |
| `id`                            | pk                 |                                              |
| `boat_id`                       | fk → boats         |                                              |
| `organization_id`               | fk → organizations | scope org                                    |
| `status`                        | enum               | `option` \| `confirmed` \| `cancelled`       |
| `starts_at` / `ends_at`         | datetime           | Luxon `DateTime` (heure incluse)             |
| `client_name`                   | string             | **client en texte libre — pas de FK client** |
| `client_email` / `client_phone` | string?            | dénormalisés                                 |
| `notes`                         | text?              |                                              |
| `total_price`                   | decimal(., 2)?     | stocké en **string** côté Lucid (précision)  |
| `created_at` / `updated_at`     | timestamps         |                                              |

> ℹ️ Le client est **dénormalisé** (pas de `client_id`). Il n'y a **ni caution
> ni devise** sur la réservation : ces informations vivent sur `boat_pricing`.

### 3.2 `boat_pricing` (#292 — 1:1 par bateau)

Modèle : `app/models/boat_pricing.ts`. Contrainte **`unique(boat_id)`**.

| Colonne                 | Type           | Notes                                  |
| ----------------------- | -------------- | -------------------------------------- |
| `organization_id`       | fk             |                                        |
| `boat_id`               | fk, **unique** | 1 tarif par bateau                     |
| `base_daily_price`      | decimal(10,2)  | tarif journalier de base (obligatoire) |
| `base_weekly_price`     | decimal(10,2)? | tarif hebdomadaire (optionnel)         |
| `deposit_amount`        | decimal(10,2)? | caution                                |
| `min_days` / `max_days` | int?           | bornes de durée                        |
| `currency`              | string(3)      | défaut `EUR`                           |

### 3.3 `pricing_seasons` (#293 — org-scopé, global ou par bateau)

Modèle : `app/models/pricing_season.ts`. Index composite
`(organization_id, boat_id)`.

| Colonne                 | Type            | Notes                                           |
| ----------------------- | --------------- | ----------------------------------------------- |
| `organization_id`       | fk              |                                                 |
| `boat_id`               | fk **nullable** | `null` = période **globale** à l'org            |
| `name`                  | string          |                                                 |
| `starts_on` / `ends_on` | date            | `@column.date()` (date seule, pas d'heure)      |
| `daily_price`           | decimal(10,2)?  | prix journalier **absolu** …                    |
| `multiplier`            | decimal(6,3)?   | … **OU** coefficient sur le tarif de base (XOR) |
| `priority`              | int             | défaut 0, départage les chevauchements          |

> ⚠️ **Convention decimals** : `base_daily_price`, `daily_price`, `multiplier`,
> `total_price`… sont exposés en **`string`** par les modèles Lucid, et
> reconvertis en **`number`** par les transformers (`Number.parseFloat`). Les
> types partagés `BoatPricingRow` / `PricingSeasonRow` portent des `number`.

---

## 4. ACL & gating

| Action                               | Contrôle                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Voir/créer/éditer une réservation    | `bouncer.with(BoatPolicy)` — `view` (index) / `manage` (mutations), même org que le bateau                             |
| Gérer le tarif de base & les saisons | **plan Enterprise** : `quotaService.assertCanManagePricing(org)` (flag `canManagePricing` dans `shared/types/plan.ts`) |
| Suppression d'une saison             | admins de l'org uniquement (`PricingSeasonPolicy.before`)                                                              |

Le **calcul du total** n'est pas gaté : il lit simplement `boat_pricing` si
présent. Un bateau sans tarif → aucune estimation, `total_price` reste à la
main de l'utilisateur.

---

## 5. Réservations

### 5.1 Statuts et transitions

`option` → `confirmed` | `cancelled` ; `confirmed` → `cancelled` ; `cancelled`
est **terminal**. Référence : `ALLOWED_RESERVATION_TRANSITIONS` dans
`app/services/boat_reservation_service.ts`.

### 5.2 Règles de conflit (anti-double-booking)

- une **`option`** est bloquée par toute réservation **non annulée** qui se
  chevauche (une seule tenue par créneau) ;
- une **`confirmed`** n'est bloquée que par une autre **`confirmed`** ; à la
  confirmation, les `option` en chevauchement sont **auto-annulées**
  (`cancelOverlappingOptions`) ;
- une **`cancelled`** ne crée jamais de conflit.

Chevauchement = `starts_at < autre.ends_at AND ends_at > autre.starts_at`.

### 5.3 Routes → controllers → pages

Réf. routes : `start/routes/boats.ts` (per-boat) et `start/routes/reservations.ts` (flotte).

| Route                                               | Controller                                   | Effet                                                                                                         |
| --------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /boats/:boatId/reservations`                   | `BoatReservationsController.index`           | Page `boats/reservations` (calendrier, liste, formulaire). **Expose `boatPricing` + `pricingSeasons`** (#294) |
| `POST /boats/:boatId/reservations`                  | `.store` (`createBoatReservationValidator`)  | Crée la réservation                                                                                           |
| `PATCH /boats/:boatId/reservations/:reservationId`  | `.update` (`updateBoatReservationValidator`) | Modifie                                                                                                       |
| `DELETE /boats/:boatId/reservations/:reservationId` | `.destroy`                                   | Supprime                                                                                                      |
| `GET /reservations` (`reservations.index`)          | `ReservationsController.index`               | Vue flotte **lecture seule** (timeline + filtre `?boatId=`)                                                   |

> La **création/édition se fait uniquement depuis le formulaire par bateau**
> (le `boatId` est fixe) ; la page flotte `/reservations` est en lecture seule.

### 5.4 Validation (`app/validators/boat_reservation_validator.ts`)

Dates : formats `YYYY-MM-DDTHH:mm` ou `YYYY-MM-DD`. `clientName` requis (1–255).
`total_price` : `number` ≥ 0, 2 décimales, optionnel/nullable. Règle
`ends_at > starts_at` vérifiée dans le service (`ReservationValidationError('endBeforeStart')`).

---

## 6. Tarification 1/3 — Tarif de base (#292)

- **Service** : `app/services/boat_pricing_service.ts` — `getForBoat(boat)`,
  `upsert(org, boat, payload)` (preserve-if-absent, valide `max_days >= min_days`).
- **Route** : `PUT /boats/:id/pricing` (`boats.pricing.update`), gatée Enterprise.
- **UI** : onglet **« Tarif »** sur la fiche bateau
  (`inertia/components/boats/show/tabs/BoatShowTabPricing.vue`) — affichage +
  formulaire d'édition réservé aux admins Enterprise, lecture seule sinon. La
  fiche bateau reçoit `pricing`, `pricingEnabled`, `canManagePricing`.
- **Erreur métier** : `InvalidPricingRangeError` (bornes incohérentes).

---

## 7. Tarification 2/3 — Périodes saisonnières (#293)

- **Service** : `app/services/pricing_season_service.ts` — CRUD org-scopé,
  `list(org, filters)`, `listBoatOptions(org)`, et pour le calcul
  **`listForBoatScope(organizationId, boatId)`** (renvoie les saisons **propres
  au bateau + globales** de l'org).
- **Route/UI** : page dédiée **`/pricing/seasons`** (`PricingSeasonsController`),
  liste + filtre par bateau + formulaire création/édition ; item de menu
  « Périodes tarifaires » visible en Enterprise.
- **Règles métier** (dans le service) :
  1. **Ordre des dates** `starts_on <= ends_on` — `InvalidSeasonDateRangeError`.
  2. **Prix XOR** : exactement un parmi `daily_price` / `multiplier` —
     `InvalidSeasonPriceError`.
  3. **Chevauchement par périmètre** : deux périodes du **même périmètre**
     (même `boat_id`, `null`=global traité comme un scope à part) ne peuvent se
     chevaucher — `SeasonOverlapError`. Les **périmètres différents** (global
     vs bateau, ou deux bateaux) **peuvent** coexister : la `priority` les
     départage au calcul.
  4. **Appartenance** : un `boat_id` fourni doit être dans l'org —
     `SeasonBoatNotFoundError`.

---

## 8. Tarification 3/3 — Calcul automatique (#294)

### 8.1 Cœur pur — `shared/helpers/reservation_quote.ts`

```ts
computeReservationQuote(
  pricing: BoatPricingRow | null,
  seasons: PricingSeasonRow[],   // saisons applicables au bateau (propres + globales)
  startsAt: string,              // ISO date ou datetime
  endsAt: string,
): ReservationQuote

countBilledNights(startsAt: string, endsAt: string): number
```

`ReservationQuote` :

| Champ                          | Sens                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| `hasPricing`                   | `false` si le bateau n'a pas de tarif de base                           |
| `currency`                     | devise du tarif                                                         |
| `nights`                       | nuits facturées = différence de jours calendaires                       |
| `total`                        | total arrondi à 2 décimales                                             |
| `deposit`                      | caution (`deposit_amount`) ou `null`                                    |
| `minDays` / `maxDays`          | bornes du tarif                                                         |
| `withinBounds` / `boundsError` | `'below_min'` \| `'above_max'` \| `null`                                |
| `usedWeeklyRate`               | au moins une semaine facturée au tarif hebdo                            |
| `lines[]`                      | détail agrégé : `{ seasonName, unitPrice, quantity, amount, isWeekly }` |

### 8.2 Algorithme (pas à pas)

1. **Nuits** : `nights = countBilledNights(start, end)` = différence de jours
   **calendaires** (l'heure est ignorée). `07-01T10:00 → 07-04T18:00` = **3
   nuits**. Reversé ou même jour → 0.
2. **Pas de tarif** → `hasPricing:false`, `total:0`.
3. **Tarif journalier par nuit** : pour chaque nuit (date = `start + i`), on
   cherche la **saison applicable** parmi `seasons` :
   - filtrer celles qui couvrent la date (`starts_on <= date <= ends_on`) ;
   - **priorité** décroissante ; à égalité, une saison **spécifique au bateau**
     (`boatId !== null`) l'emporte sur une **globale** ;
   - tarif de la nuit = `daily_price` (absolu) **ou** `base_daily_price ×
multiplier` ; à défaut de saison → `base_daily_price`.
4. **Tarif hebdomadaire** (« semaine vs jour ») : **uniquement si aucune saison
   ne s'applique** sur le séjour **et** `base_weekly_price` est défini →
   `semaines_pleines × weekly + reste × base_daily_price`.
   Dès qu'une saison s'applique, on repasse en facturation nuit par nuit.
5. **Agrégation** : les nuits au même (saison, tarif) sont regroupées en une
   ligne. Total = somme des lignes, arrondi 2 décimales.
6. **Bornes** : `withinBounds` faux si `nights < min_days` (`below_min`) ou
   `nights > max_days` (`above_max`).

### 8.3 Exemples chiffrés

| Cas                          | Entrée                                          | Résultat                               |
| ---------------------------- | ----------------------------------------------- | -------------------------------------- |
| Base seul                    | base 100, 3 nuits, pas de saison/hebdo          | `300` (1 ligne ×3)                     |
| Semaine vs jour              | base 100, hebdo 600, 10 nuits                   | `900` = 1×600 + 3×100 (2 lignes)       |
| Mono-saison (absolu)         | base 100, saison 150 sur tout, 3 nuits          | `450` (hebdo ignoré)                   |
| Mono-saison (multiplicateur) | base 100, saison ×1.5, 3 nuits                  | `450` (150/nuit)                       |
| Multi-saison                 | base 100, saison 200 du 07-02, résa 07-01→07-04 | `500` = 100 + 200 + 200                |
| Priorité / périmètre         | global 200 (prio 1) + bateau 300 (prio 1)       | `300` (bateau gagne)                   |
| Priorité supérieure          | global 500 (prio 9) + bateau 300 (prio 1)       | `500` (prio gagne)                     |
| Hors bornes                  | base 100, `min_days 5`, 3 nuits                 | `total 300`, `boundsError 'below_min'` |

### 8.4 Intégration backend

- **`ReservationQuoteService.quoteForBoat(boat, startsAt, endsAt)`**
  (`app/services/reservation_quote_service.ts`) : charge le tarif
  (`toBoatPricingRow`) + `listForBoatScope`, appelle le cœur.
- **`BoatReservationService`** (`create` / `update`) :
  - **auto-remplissage** : au `create`, si `total_price` non fourni **et** tarif
    configuré → `total_price = quote.total` ;
  - **enforcement des bornes** : au `create` **et** `update`, si le tarif définit
    `min_days`/`max_days` et que la durée est hors bornes →
    `ReservationDurationError('below_min' | 'above_max')`.
- **`BoatReservationsController`** : `index` expose `boatPricing` +
  `pricingSeasons` ; `store`/`update` traduisent `ReservationDurationError` en
  flash (`flash.reservation.belowMinDays` / `aboveMaxDays`).

### 8.5 Intégration frontend

- **`ReservationQuoteCard.vue`** (`inertia/components/reservations/`) : calcule
  le devis en direct (`computeReservationQuote`) et affiche le détail par ligne,
  la caution, un avertissement si hors bornes et un bouton **« appliquer »**
  (`emit('apply', total)`).
- **`ReservationForm.vue`** (création) : intègre la carte ; **pré-remplit**
  `total_price` s'il est **vide** quand les dates changent, sans jamais écraser
  une saisie manuelle (le bouton « appliquer » force la valeur).
- **`ReservationEditModal.vue`** (édition, via `ReservationList.vue`) : affiche
  la carte, **sans** auto-remplissage (seul « appliquer » met à jour le champ).

---

## 9. Internationalisation

| Namespace                                         | Portée | Contenu                   |
| ------------------------------------------------- | ------ | ------------------------- |
| `boats.pricing.*`, `boats.show.tabs.pricing`      | front  | onglet Tarif (#292)       |
| `pricingSeasons.*`, `nav.pricingSeasons`          | front  | page saisons (#293)       |
| `reservations.quote.*`                            | front  | carte d'estimation (#294) |
| `flash.pricing.*`, `flash.quota.pricingExceeded`  | back   | tarif (#292)              |
| `flash.pricingSeason.*`                           | back   | saisons (#293)            |
| `flash.reservation.belowMinDays` / `aboveMaxDays` | back   | bornes (#294)             |

Toutes les clés existent en **`en` et `fr`**.

---

## 10. Tests

| Niveau          | Fichier                                                                                                        | Couvre                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unitaire (Japa) | `tests/unit/helpers/reservation_quote.spec.ts`                                                                 | cœur pur : mono/multi-saison, semaine vs jour, multiplicateur, priorité de périmètre, bornes, sans tarif (13 tests) |
| Fonctionnel     | `tests/functional/boats/pricing.spec.ts`                                                                       | tarif de base : upsert, bornes, gating, IDOR (#292)                                                                 |
| Fonctionnel     | `tests/functional/pricing/pricing_seasons.spec.ts`                                                             | saisons : CRUD, chevauchement, XOR, priorité, gating, IDOR (#293)                                                   |
| Fonctionnel     | `tests/functional/boats/reservation_pricing.spec.ts`                                                           | auto-remplissage, saison appliquée, rejets hors bornes, props exposées, non-régression (#294)                       |
| Vitest          | `tests/inertia/boat_show_tab_pricing.spec.ts`, `pricing_season_form.spec.ts`, `reservation_quote_card.spec.ts` | composants UI                                                                                                       |

---

## 11. Fichiers de référence (carte)

- **Réservations** : `app/models/boat_reservation.ts`,
  `app/services/boat_reservation_service.ts`,
  `app/controllers/boat_reservations_controller.ts`,
  `app/controllers/reservations_controller.ts`,
  `app/validators/boat_reservation_validator.ts`,
  `shared/types/reservation.ts`, `app/exceptions/reservation_errors.ts`
- **Tarif de base** : `app/models/boat_pricing.ts`,
  `app/services/boat_pricing_service.ts`,
  `app/transformers/boat_pricing_transformer.ts`,
  `app/controllers/boat_pricing_controller.ts`, `shared/types/boat_pricing.ts`
- **Saisons** : `app/models/pricing_season.ts`,
  `app/services/pricing_season_service.ts`,
  `app/controllers/pricing_seasons_controller.ts`,
  `app/policies/pricing_season_policy.ts`,
  `app/exceptions/pricing_season_errors.ts`, `shared/types/pricing_season.ts`
- **Calcul** : `shared/helpers/reservation_quote.ts`,
  `app/services/reservation_quote_service.ts`,
  `inertia/components/reservations/ReservationQuoteCard.vue`
- **Gating** : `shared/types/plan.ts` (`canManagePricing`),
  `app/services/quota_service.ts`, `app/exceptions/quota_errors.ts`

---

## 12. Limites connues & choix d'implémentation

- **Client en texte libre** : les réservations ne référencent pas la fiche
  client (CRM #108/#273) ; `client_name/email/phone` sont dénormalisés. Un
  rapprochement `reservation ↔ client` est une évolution possible (cf. #275).
- **Dates** : réservations en **datetime**, saisons en **date seule** ; le
  calcul raisonne en **nuits calendaires** (l'heure est ignorée pour la
  facturation). Une réservation intra-journée compte 0 nuit.
- **Tarif hebdomadaire ignoré dès qu'une saison s'applique** : choix assumé
  pour garder un calcul déterministe et lisible ; à revoir si un besoin de
  « semaine saisonnière » émerge.
- **Bornes min/max** : **bloquantes** côté serveur (create + update) quand le
  tarif les définit ; le formulaire affiche l'avertissement en amont.
- **Total modifiable** : l'auto-remplissage ne s'applique qu'au `create` et
  seulement si le champ est vide ; l'utilisateur garde toujours la main.
