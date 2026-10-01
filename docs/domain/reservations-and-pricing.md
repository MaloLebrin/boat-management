# Domaine — Réservations & Tarification

> Documentation consolidée du module **réservations** de bateaux et de son
> **système de tarification** (tarif de base, périodes saisonnières, calcul
> automatique du total). Couvre les epics #107 (réservations) et #284
> (tarification & saisonnalité — lots #292, #293, #294).
>
> Le **rattachement d'une réservation à une fiche client** (lien, historique,
> blocage blacklist — #275) est documenté dans
> [`clients.md`](./clients.md).

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
`canManagePricing`). Les **réservations le sont tout autant** : depuis #595,
les deux groupes de routes — celui par bateau (`start/routes/boats.ts`) et la
vue flotte (`start/routes/reservations.ts`) — portent
`middleware.requireModulePlan({ feature: 'reservations' })`, soit le tier
Enterprise, soit le module add-on `charter` sur le socle Pro. Une organisation
`starter` ou `pro` sans module est redirigée vers `/settings/billing` avant
d'atteindre le contrôleur, sur les lectures **comme** sur les écritures.
Exhaustivité tenue par `tests/unit/hygiene/charter_routes_gated.spec.ts`,
comportement par `tests/functional/reservations/module_guard.spec.ts` (#694).

Le calcul automatique du total, lui, ne s'active que si un tarif de base est
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

| Colonne                                    | Type               | Notes                                           |
| ------------------------------------------ | ------------------ | ----------------------------------------------- |
| `id`                                       | pk                 |                                                 |
| `boat_id`                                  | fk → boats         |                                                 |
| `organization_id`                          | fk → organizations | scope org                                       |
| `status`                                   | enum               | `option` \| `confirmed` \| `cancelled`          |
| `type`                                     | enum?              | Type de prestation (#585) — voir ci-dessous     |
| `starts_at` / `ends_at`                    | datetime           | Luxon `DateTime` (heure incluse)                |
| `client_id`                                | fk → clients?      | Lien CRM optionnel (#275), `ON DELETE SET NULL` |
| `client_name`                              | string             | Instantané dénormalisé, conservé même sans lien |
| `client_email` / `client_phone`            | string?            | dénormalisés                                    |
| `notes`                                    | text?              |                                                 |
| `total_price`                              | decimal(., 2)?     | stocké en **string** côté Lucid (précision)     |
| `deposit_amount` … `security_deposit_note` | —                  | Paiement et caution (#875) — voir § 5.5         |
| `created_at` / `updated_at`                | timestamps         |                                                 |

> ℹ️ Le client est **dénormalisé** — nom, e-mail et téléphone sont recopiés sur
> la réservation — mais un `client_id` optionnel le relie au CRM depuis #275 :
> supprimer le client annule la clé étrangère et laisse l'instantané intact. La
> **devise** vit sur `boat_pricing` ; la **caution** y est définie, puis
> recopiée sur la réservation à la confirmation (#875, § 5.5).

**Type de prestation (#585).** `bareboat` | `skippered` | `day_charter` |
`cabin` | `other` (`RESERVATION_TYPES`, `shared/types/reservation.ts`),
**nullable** avec contrainte CHECK : une location coque nue, une sortie skippée
et une croisière à la cabine n'ont ni le même prix ni les mêmes obligations
(skipper à bord, permis du client), que `status` seul ne distinguait pas.

- Saisie : select dans `ReservationForm.vue` et `ReservationEditModal.vue`
  (vide = « non précisé », envoyé en `null`).
- Affichage : `ReservationTypeBadge.vue` dans la liste par bateau et la liste
  flotte. Le calendrier et la frise sont trop denses pour un badge : le type y
  rejoint l'infobulle, à côté du nom du client.
- Filtre : `GET /reservations?type=…`, cumulable avec `?boatId=`. Une valeur
  inconnue est ignorée plutôt que rejetée.
- Les réservations antérieures gardent `type` nul et s'affichent sans badge.

> ⚠️ Hors périmètre de #585 : la vérification croisée « le client a-t-il le
> permis requis par le type de réservation ? » et toute tarification
> différenciée par type.

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

| Action                               | Contrôle                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voir/créer/éditer une réservation    | `bouncer.with(BoatPolicy)` — `view` (index) / `manage` (mutations), même org que le bateau                                                                                                                                                                                                                                    |
| Supprimer une réservation            | `BoatPolicy.deleteReservation` — capacité `boats.reservations.delete` **et** `status !== 'confirmed'` : une réservation confirmée n'est jamais supprimable, quel que soit le rôle. L'annuler d'abord                                                                                                                          |
| Gérer le tarif de base & les saisons | **capacité `canManagePricing`** : tier Enterprise ou module add-on `charter` sur le socle Pro (#327) — `quotaService.assertCanManagePricing(org)`. Un accès sans la capacité est redirigé vers `/settings/billing` (`BILLING_SETTINGS_PATH`), jamais vers `/` qui mène à la home marketing publique sans flash visible (#456) |
| Suppression d'une saison             | admins de l'org uniquement (`PricingSeasonPolicy.before`)                                                                                                                                                                                                                                                                     |

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

### 5.2 bis Disponibilité du bateau (#870)

Après le contrôle anti-double-booking, `assertBoatAvailable` consulte les fenêtres
d'indisponibilité de `BoatAvailabilityService`. Les règles :

- **bateau `sold`** : toute réservation non annulée est refusée, option comprise, et rien ne
  permet de forcer (flash `flash.reservation.boatSold`) ;
- **`confirmed`** chevauchant une fenêtre (statut `in_maintenance` / `out_of_service`, tâche
  ouverte datée, incident immobilisant ouvert) : refusée avec `BoatUnavailableError`. Le flash
  `flash.reservation.boatUnavailable` liste les motifs ;
- **`option`** : jamais bloquée par une indisponibilité ;
- **forçage** : `forceReason`, facultatif, est accepté par les deux validators. Le contrôleur ne le
  transmet que si l'utilisateur a `boats.reservations.force`, une capability réservée à l'admin.
  La réservation est alors posée et une ligne d'audit `reservation.force_unavailable` est écrite
  (motif et fenêtres passées outre), avec le flash `flash.reservation.forcedUnavailable` ;
- à la **modification**, la règle ne rejoue que si les dates ou le statut changent. Une
  réservation déjà confirmée reste éditable (notes, client…) si le bateau est devenu
  indisponible depuis.

La page `boats/reservations` reçoit `availability` (bandeau) et `canForceUnavailable`. Ce dernier
affiche le champ « motif de forçage » du formulaire quand le statut choisi est `confirmed`.

### 5.2 ter Synchronisation iCal (#880)

Un loueur publie ses bateaux sur plusieurs plateformes (Click&Boat, Samboat,
Airbnb…). Le flux iCal (`.ics`, RFC 5545) est le standard de synchronisation
entre elles. FleetAi en publie et en importe.

**Export : flux publié par jeton.** `GET /calendar/<jeton>.ics` (route
`calendar.feed`, sans session, limitée à 30 lectures/min/IP) :

- un flux par bateau (onglet Réservations du bateau) et un pour la flotte
  (`/reservations`), table `calendar_feeds` ;
- jeton de 32 octets aléatoires (base64url, 43 caractères), gardé en clair
  pour que l'écran puisse réafficher l'URL, comme l'« adresse secrète » d'un
  agenda Google. **Régénérer** crée un nouveau jeton et supprime l'ancien.
  **Révoquer** supprime la ligne. L'ancienne URL répond alors 404, comme un
  jeton inconnu ou une organisation qui a perdu le module Location ;
- contenu : réservations `confirmed` (`STATUS:CONFIRMED`) et `option`
  (`STATUS:TENTATIVE`) terminées depuis moins d'un an. Une annulation sort du
  flux, ce qui la retire des agendas abonnés ;
- `UID` stable (`reservation-<id>@<hôte APP_URL>`). `SEQUENCE` =
  `boat_reservations.ical_sequence`, incrémenté par le hook `beforeSave`
  quand les dates, le statut ou le nom du client changent. L'anonymisation
  d'un client l'incrémente à la main, parce que c'est une mise à jour en masse ;
- `SUMMARY` = « <bateau> — Réservé / Option ». Le nom du client n'y figure
  que si l'option « Inclure le nom du client » est cochée (désactivée par
  défaut, puisque l'URL est lue par des tiers). « Inclure les entretiens
  planifiés » ajoute les tâches ouvertes datées en journées entières ;
- **jamais** les créneaux importés : ils reviendraient en écho sur la
  plateforme d'où ils viennent ;
- `Cache-Control: private, max-age=300`, `X-Robots-Tag: noindex`, textes
  dans la locale de qui a créé le flux (`calendar_feeds.locale`).

**Import : calendriers externes.** Sur un bateau, `POST
/boats/:boatId/external-calendars` (nom + URL) enregistre le flux d'une
plateforme (`external_calendars`) et le synchronise aussitôt. Ensuite, une
synchronisation a lieu toutes les 30 minutes (job `SyncExternalCalendars`) et
à la demande (bouton « Synchroniser »).

- Les créneaux vivent dans `external_calendar_events`, **pas** dans
  `boat_reservations` (écart assumé avec la piste « réservation de type
  `external` » de l'issue) : ils bloquent les dates sans entrer dans le
  chiffre d'affaires, l'occupation, la facturation, les paiements ni les
  exports. La location est facturée par la plateforme ;
- **idempotent par `UID`** : un créneau déplacé est mis à jour, un créneau
  disparu du flux est supprimé. Un échec (`last_error` : `unsafe_url`,
  `timeout`, `too_large`, `http_error`, `network`, `invalid_ics`) garde les
  créneaux de la dernière synchronisation réussie ;
- parseur maison (`app/services/ical_service.ts`) : dates entières (heure
  de Paris), UTC, `TZID` (un nom Windows inconnu retombe sur Paris), heures
  flottantes, `DURATION`. `STATUS:CANCELLED` et `TRANSP:TRANSPARENT` sont
  écartés. Une `RRULE` n'est pas déroulée, seule la première occurrence
  compte : les plateformes publient une réservation par événement. Les
  créneaux terminés depuis plus de 30 jours sont ignorés, et un flux est
  plafonné à 2 000 créneaux ;
- **règle de conflit** : un créneau importé bloque une `option` comme une
  `confirmed` (`ReservationExternalConflictError`, flash
  `flash.reservation.externalConflict` qui nomme le calendrier). Il n'y a
  pas de forçage : un flux périmé se corrige en le resynchronisant ou en le
  retirant. À la modification, la règle ne rejoue que si les dates ou le
  statut changent. Une réservation posée avant l'import reste éditable ;
- `conflict_count` compte les créneaux importés qui chevauchent déjà une
  réservation FleetAi non annulée (double réservation). Il est affiché sur
  l'encart et signalé par un flash après la synchronisation.

**Sécurité de l'import (SSRF, `app/services/calendar_fetcher.ts`).** L'URL
est saisie par un utilisateur et téléchargée par le serveur :

- `https` seulement (`webcal://` est lu en `https`), port 443, pas
  d'identifiants dans l'URL, ni `localhost`, `*.localhost` ou `*.internal` ;
- chaque adresse résolue est vérifiée **au moment de la connexion**
  (option `lookup` de `https.request`). Sont refusées les IP privées, de
  boucle locale, de lien local (dont `169.254.169.254`), CGNAT, de
  documentation, multicast, et leurs formes IPv6 (IPv4 mappée, NAT64). Un
  nom public qui résout vers le réseau interne est donc coupé, sans fenêtre
  de DNS rebinding ;
- redirections suivies à la main, 3 au plus, chacune revérifiée. Délai de
  10 s, taille maximale de 2 Mo ;
- l'écran n'affiche que l'hôte de l'URL importée, jamais l'URL complète :
  elle porte souvent le jeton de la plateforme.

**Droits et gating.** Routes dans le groupe `requireModulePlan({ feature:
'reservations' })`. Les actions sur un bateau demandent `BoatPolicy.manage`,
le flux de flotte `BoatPolicy.manageFleetCalendar` (`boats.manage`). Un
mécanicien voit les calendriers, mais ne peut ni publier ni importer. Audit :
`calendar.token_created`, `calendar.token_revoked`,
`external_calendar.added`, `external_calendar.removed`.

**Écran.** `BoatCalendarSyncCard.vue` sur `boats/reservations`
(`CalendarFeedPanel.vue` pour l'export, `ExternalCalendarList.vue` pour
l'import), et `CalendarFeedPanel` dans une carte de `/reservations`. Les
créneaux importés s'affichent en violet pointillé, non modifiables : prop
`externalBlocks` du calendrier mensuel, et `calendarEntries[].external` sur
la frise. Leurs jours (`startsOn`/`endsOn`) sont calculés à l'heure de
Paris, pour qu'une journée entière importée ne déborde pas sur la veille.
Guide utilisateur :
[`docs/user-guide/ical-synchronisation.md`](../user-guide/ical-synchronisation.md).

### 5.2 quater Page publique de réservation (#881)

Un loueur publie un lien « voir les disponibilités et réserver » sur son site
et ses réseaux, sans passer par une plateforme à commission. Le client final
n'a pas de compte : sa demande devient une **option** que le loueur confirme
ou refuse.

**Routes (sans session).** Dans `start/routes/reservations.ts` :

| Route                                   | Nom            | Rôle                                 |
| --------------------------------------- | -------------- | ------------------------------------ |
| `GET /book/:orgSlug`                    | `book.fleet`   | page flotte : les bateaux ouverts    |
| `GET /book/:orgSlug/:boatSlug`          | `book.show`    | fiche, calendrier, devis, formulaire |
| `POST /book/:orgSlug/:boatSlug/request` | `book.request` | la demande                           |

- `orgSlug` = `organizations.slug` (existant). `boatSlug` =
  `boats.public_booking_slug`, dérivé du nom à la première ouverture
  (`Bélouga II` → `belouga-ii`, suffixe `-2`, `-3`… en cas de doublon dans
  l'organisation) puis **figé** : renommer le bateau ou fermer puis rouvrir
  la page garde le même lien ;
- 404 (page `errors/not_found`) pour une organisation inconnue, sans le module
  Location (`QuotaService.canManageReservations`), un bateau fermé ou vendu —
  sans dire lequel ;
- `X-Robots-Tag: noindex` et `<meta name="robots" content="noindex">` : la
  page n'est pas indexée (l'option « indexable » de l'issue est reportée) ;
- throttles : `publicBookingThrottle` (60/min/IP) sur les deux GET — chaque
  choix de dates est une visite partielle — et `publicBookingRequestThrottle`
  (5/10 min/IP) sur le POST, qui rend un flash
  (`flash.publicBooking.rateLimit`, via `RATE_LIMIT_FLASH_ROUTES`) plutôt
  qu'une 429 brute.

**Jours occupés, sans donnée personnelle.** `PublicBookingService.busyRanges`
renvoie des plages de jours `[startsOn, endsOn[` à l'heure de Paris, fusionnées,
sur la fenêtre réservable (de J+1 à 12 mois) :

- réservations `option` et `confirmed` (une demande en attente tient le créneau) ;
- créneaux importés (#880) ;
- fenêtres d'indisponibilité (#870) : statut, tâche datée, incident
  immobilisant.

Aucun nom, e-mail, nom de calendrier ou titre de tâche ne sort : la page ne
sait que « indisponible ». Le jour du départ reste libre : une arrivée peut le
suivre le même jour.

**Dates et devis.** Le client choisit une arrivée puis un départ (au moins une
nuit). Les règles de sélection sont partagées front/back
(`shared/helpers/public_booking.ts` : `canPickDay`, `nextDraft`,
`selectionOverlapsBusy`). Chaque sélection complète recharge la seule prop
`quote` (`router.get(..., { only: ['quote'] })`, dates en query string) : le
devis est calculé côté serveur par `ReservationQuoteService` (tarif de base +
saisons, #294). La page n'a donc pas besoin d'endpoint JSON. `quote.state`
vaut `ok`, `unavailable` (jour occupé) ou `invalid` (dates incohérentes, hors
fenêtre). La page affiche aussi l'acompte de 30 % demandé à la confirmation
(#875) et la caution du tarif.

**Demande.** `POST …/request` (validator `publicBookingRequestValidator` :
nom, e-mail, téléphone, message, consentement obligatoire, champ piège
`website`) → `BoatReservationService.createPublicRequest` :

- réservation `status: 'option'`, `source: 'public'` (nouvelle colonne,
  `internal` par défaut), `request_locale` = langue de la page, message du
  client dans `notes`, `total_price` = devis ;
- les dates sont minuit → minuit à l'heure de Paris ;
- la transaction revérifie tout : conflit de réservation, créneau importé,
  **et** fenêtre d'indisponibilité. C'est plus strict qu'une option saisie
  par l'équipe : le client ne peut pas savoir qu'un entretien est planifié ;
- durée hors des bornes du tarif → flash `tooShort` / `tooLong` ; dates
  prises entre l'affichage et l'envoi → flash `unavailable` ;
- champ piège rempli → réponse identique à un succès, rien n'est écrit ni
  envoyé.

Le client n'est pas rattaché au CRM : les champs `client_name/email/phone` de
la réservation suffisent. Le loueur le lie à une fiche client depuis la
réservation s'il le souhaite.

**Notifications.** Événement `PublicBookingRequested` →
`OnPublicBookingRequested` :

- chaque admin de l'organisation reçoit une notification
  `reservation.requested` (in-app + push, lien vers l'onglet Réservations du
  bateau) et un e-mail dans sa langue ;
- le client reçoit un accusé de réception aux couleurs du loueur (marque
  blanche, plan Entreprise).

Le loueur tranche depuis l'onglet Réservations ou `/reservations`, avec les
actions existantes. Passer l'option en `confirmed` ou `cancelled` émet
`PublicBookingDecided`, et le client reçoit « confirmée » ou « pas pu être
confirmée ». Une option publique annulée d'office par une confirmation sur le
même créneau (`cancelOverlappingOptions`) est traitée comme un refus. Une
réservation `internal` n'envoie jamais rien à son client. Les quatre e-mails
partagent le gabarit `resources/views/emails/public_booking.edge` et
`EmailQueueService.sendPublicBookingEmail`.

Le contrat n'est **pas** envoyé automatiquement à la confirmation : il exige
une fiche client (#275). Le loueur le génère depuis la réservation, comme
pour une saisie interne. L'e-mail de confirmation l'annonce.

**Purge (RGPD).** `PurgePublicFormData` (quotidien, #775) appelle
`PublicBookingService.purgeExpiredRequests` : sont supprimées les demandes
`source: 'public'` créées il y a plus de 30 jours
(`PUBLIC_BOOKING_REQUEST_RETENTION_DAYS`), encore en `option` ou annulées, **sans**
encaissement, contrat, facture ni état des lieux. Une location confirmée,
payée ou documentée reste dans l'historique.

**Ouverture.** Encart « Réservation en ligne »
(`BoatPublicBookingCard.vue`) sur l'onglet Réservations du bateau : bascule,
lien à copier, lien de la page flotte. `PATCH /boats/:boatId/public-booking`
(`boats.publicBooking.update`, `{ enabled }`), dans le groupe
`requireModulePlan({ feature: 'reservations' })`, avec `BoatPolicy.manage`.
Un mécanicien ne peut pas ouvrir la page. Dans les listes, une demande en
ligne porte le badge « Demande en ligne » (`ReservationSourceBadge`).

**Marque blanche.** L'en-tête de la page (`inertia/layouts/booking.vue`)
montre le nom de l'organisation. En plan Entreprise (`canWhiteLabel`), il
montre aussi son logo et son `appName`. Les couleurs de la marque ne sont
pas appliquées à la page, qui reste sur les tokens du thème.

### 5.3 Routes → controllers → pages

Réf. routes : `start/routes/boats.ts` (per-boat) et `start/routes/reservations.ts` (flotte).

| Route                                                                                   | Controller                                   | Effet                                                                                                         |
| --------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /boats/:boatId/reservations`                                                       | `BoatReservationsController.index`           | Page `boats/reservations` (calendrier, liste, formulaire). **Expose `boatPricing` + `pricingSeasons`** (#294) |
| `POST /boats/:boatId/reservations`                                                      | `.store` (`createBoatReservationValidator`)  | Crée la réservation                                                                                           |
| `PATCH /boats/:boatId/reservations/:reservationId`                                      | `.update` (`updateBoatReservationValidator`) | Modifie                                                                                                       |
| `DELETE /boats/:boatId/reservations/:reservationId`                                     | `.destroy`                                   | Supprime — **jamais une `confirmed`** (voir ACL ci-dessus)                                                    |
| `GET /reservations` (`reservations.index`)                                              | `ReservationsController.index`               | Vue flotte **lecture seule** (timeline + filtre `?boatId=`)                                                   |
| `POST/PATCH/DELETE /boats/:boatId/calendar-feed`                                        | `CalendarFeedsController`                    | Flux iCal du bateau : créer ou régénérer, contenu, révoquer (#880)                                            |
| `POST/PATCH/DELETE /reservations/calendar-feed`                                         | `CalendarFeedsController`                    | Flux iCal de la flotte (#880)                                                                                 |
| `GET /calendar/:jeton.ics` (`calendar.feed`)                                            | `CalendarFeedsController.show`               | Flux publié, **sans session** (#880)                                                                          |
| `POST /boats/:boatId/external-calendars` (+ `/:calendarId/sync`, `DELETE /:calendarId`) | `ExternalCalendarsController`                | Calendriers externes importés (#880)                                                                          |

| `GET/POST /boats/:boatId/reservations/:reservationId/crew` (+ `DELETE /:assignmentId`, `GET /pdf`) | `ReservationCrewController` | Équipage de la réservation, chevauchements refusés, rôle PDF (#883) — voir [`crew.md`](crew.md#planning-déquipage-883) |

> La **création/édition se fait uniquement depuis le formulaire par bateau**
> (le `boatId` est fixe) ; la page flotte `/reservations` est en lecture seule.

> **Entretiens planifiés sur la frise (#869)** : chaque `calendarEntries[]`
> porte `maintenance` (tâches ouvertes datées en plages de jours, pour qui a
> `maintenance.view`), rendu en liseré sous les locations. À l'inverse,
> `/planning` superpose les réservations aux tâches — voir
> [`planning.md`](planning.md).

### 5.5 Paiement : acompte, solde et caution (#875)

Suivi **manuel** de l'argent d'une location. Le paiement en ligne (#876) passe
par la **facture** de la réservation, qui reçoit un lien `/pay/:token` — voir
[`invoicing.md`](./invoicing.md) §7 bis. Service : `app/services/reservation_payment_service.ts` ; calculs
purs : `shared/helpers/reservation_payment.ts` ; types :
`RESERVATION_PAYMENT_STATUSES`, `RESERVATION_PAYMENT_METHODS`,
`SECURITY_DEPOSIT_STATUSES` (`shared/types/reservation.ts`).

**À la confirmation** (création en `confirmed` ou passage `option` → `confirmed`),
`applyDefaults` pose :

- l'**acompte attendu** `deposit_amount` = 30 % du prix (`DEFAULT_DEPOSIT_PERCENT`),
  recalculé à chaque modification du prix tant qu'il n'est pas reçu ;
- la **caution** `security_deposit_amount` = `boat_pricing.deposit_amount`, tant
  qu'elle n'est pas bloquée.

Un prix corrigé après un encaissement recalcule `payment_status` (un dossier
soldé dont le prix augmente redevient `deposit_paid`).

**Encaissements** — `PATCH /boats/:boatId/reservations/:reservationId/payment`
(`kind`, `method?`, `amount?`) :

| `kind`    | Condition                                                    | Effet                                                                       |
| --------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `deposit` | réservation non annulée, `unpaid`                            | `amount` (défaut : l'acompte attendu, ≤ prix) → `deposit_paid_at`, encaissé |
| `balance` | non annulée, `unpaid` ou `deposit_paid`, prix renseigné      | encaissé = prix, `balance_paid_at`, statut `paid`                           |
| `refund`  | quelque chose d'encaissé, pas déjà `refunded` (même annulée) | statut `refunded` (l'encaissé reste lisible)                                |

Le statut dérive de l'encaissé : rien → `unpaid`, une partie → `deposit_paid`,
tout → `paid`. `payment_method` garde le moyen du dernier encaissement.

**Caution** — `PATCH /boats/:boatId/reservations/:reservationId/security-deposit`
(`action`, `amount?`, `note?`) : `hold` (`none` → `held`, montant par défaut celui
du tarif), puis `release` (`held` → `released`) ou `retain` (`held` → `retained`,
montant retenu ≤ caution et motif obligatoires).

Les deux routes vivent dans le groupe du module Location et exigent
`BoatPolicy.manage` (`boats.manage`). Un refus métier (`ReservationPaymentError`)
revient en flash `flash.reservation.payment.errors.<code>` sans rien écrire.
Chaque geste est tracé au journal d'audit : `reservation.payment_recorded` (type,
montant, moyen, statut), `reservation.security_deposit_held|released|retained`.

**Ce qui réclame une action** — `paymentAttention()`, partagé par l'écran et le
scan quotidien :

- `balance_due` : réservation confirmée, départ à moins de 7 jours (ou passé),
  solde restant ;
- `deposit_due` : réservation confirmée `unpaid` avec un acompte attendu.

Le scan `NotificationScanService` crée `reservation.deposit_due` et
`reservation.balance_due` (une notification par bateau, avec le compte, vers
`/boats/:id/reservations`, anti-doublon 7 jours), adressées aux admins et
poussables (`PUSHABLE_NOTIFICATION_TYPES`).

**Écrans.** Colonne « Paiement » (`ReservationPaymentBadge.vue`) dans la liste
par bateau et la liste flotte ; point rouge sur la pastille du calendrier ;
action « Paiement » de la ligne → `ReservationPaymentModal.vue` /
`ReservationPaymentPanel.vue` (montants, encaissements, caution) ; bloc
« Caution » sur l'écran d'état des lieux (`docs/domain/inspections.md`).

> Hors périmètre de ce lot : factures d'acompte et de solde générées depuis la
> réservation, facture de dommages sur caution retenue, widget « Encaissements
> à venir » du tableau de bord, colonnes paiement dans un export CSV des
> réservations (qui n'existe pas encore, #879), pourcentage d'acompte
> configurable par organisation ou par tarif.

### 5.4 Validation (`app/validators/boat_reservation_validator.ts`)

Dates : formats `YYYY-MM-DDTHH:mm` ou `YYYY-MM-DD`. `clientName` requis (1–255).
`total_price` : `number` ≥ 0, 2 décimales, optionnel/nullable. Règle
`ends_at > starts_at` vérifiée dans le service (`ReservationValidationError('endBeforeStart')`).

**Fuseau horaire (#452)** : `startsAt`/`endsAt` arrivent d'un `datetime-local`,
donc en horloge murale naïve. Le formulaire envoie aussi `tzOffsetMinutes`
(le `getTimezoneOffset()` du navigateur) et le service applique
`toUtcFromLocalInput` pour stocker l'instant réellement visé. Le champ est
optionnel : une requête sans offset garde l'ancien comportement
(naïf interprété comme UTC), ce qui préserve les rejeux hors-ligne et les
appels API qui postent déjà une date absolue.

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
| Unitaire (Japa) | `tests/unit/helpers/reservation_payment.spec.ts`                                                               | acompte par défaut, reste dû, statut, `paymentAttention` (#875)                                                     |
| Fonctionnel     | `tests/functional/reservations/payment.spec.ts`                                                                | défauts à la confirmation, encaissements, refus, caution, cross-org, scan (#875)                                    |
| Vitest          | `tests/inertia/reservation_payment.spec.ts`                                                                    | badge, panneau Paiement, bloc Caution (#875)                                                                        |

---

## 11. Fichiers de référence (carte)

- **Réservations** : `app/models/boat_reservation.ts`,
  `app/services/boat_reservation_service.ts`,
  `app/controllers/boat_reservations_controller.ts`,
  `app/controllers/reservations_controller.ts`,
  `app/validators/boat_reservation_validator.ts`,
  `shared/types/reservation.ts`, `app/exceptions/reservation_errors.ts`
- **Paiement (#875)** : `app/services/reservation_payment_service.ts`,
  `app/controllers/reservation_payments_controller.ts`,
  `app/validators/reservation_payment.ts`, `shared/helpers/reservation_payment.ts`,
  `inertia/components/reservations/payment/`
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
- **Page publique (#881), V1** : pas de paiement en ligne à la demande (l'acompte
  est réclamé à la confirmation, hors page) ; `noindex` sans option
  d'indexation ; pas de quota de demandes par mois ; couleurs de la marque
  blanche non appliquées à la page (logo et nom seulement) ; le contrat n'est
  pas envoyé automatiquement à la confirmation (il exige une fiche client).
