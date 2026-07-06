# Domaine — Facturation (devis & factures)

> Documentation consolidée du module **facturation** : devis et factures
> org-scopés, réservés au plan **Enterprise**. Couvre l'intégralité de l'epic
> #282 (lots #285 socle, #286 PDF + email, #287 conversion & statuts, #288 devis
> depuis réservation).
>
> Modules liés : [`reservations-and-pricing.md`](./reservations-and-pricing.md)
> (source du pré-remplissage) et [`crew.md`](./crew.md) / CRM clients (client lié).

---

## 1. Objectif fonctionnel

Permettre à une entreprise de location/charter de gérer le **cycle documentaire**
d'une prestation :

1. **Créer des devis et des factures** multi-lignes, avec calcul de TVA, pour un
   client (optionnellement rattaché à une fiche client) et une réservation.
2. **Numéroter** les documents de façon **séquentielle et sans trou**, par
   organisation et par type (`DEV-000001` pour les devis, `FAC-000001` pour les
   factures).
3. **Générer un PDF** brandé et l'**envoyer par email** au client en pièce jointe.
4. **Gérer le cycle de vie** : convertir un devis accepté en facture, marquer une
   facture payée, basculer automatiquement en « en retard » (`overdue`).
5. **Partir d'une réservation** : générer un devis pré-rempli en un clic, avec un
   lien bidirectionnel réservation ↔ document.

La facturation est une **fonctionnalité du plan Enterprise** (gating
`canManageInvoices`). Toutes les données sont **org-scopées** (isolation stricte
entre organisations, protection IDOR).

| Lot             | Issue | Objet                                   | PR   |
| --------------- | ----- | --------------------------------------- | ---- |
| Facturation 1/4 | #285  | Socle : CRUD, numérotation, lignes, TVA | #303 |
| Facturation 2/4 | #286  | Génération PDF + envoi email            | #304 |
| Facturation 3/4 | #287  | Conversion devis→facture + statuts      | #305 |
| Facturation 4/4 | #288  | Devis pré-rempli depuis réservation     | #306 |

---

## 2. Vue d'ensemble / architecture

```
   Formulaire (Vue)                     InvoicesController                Services / DB
  ┌────────────────┐   router.post    ┌───────────────────┐   create   ┌──────────────────┐
  │ form.vue       │ ───────────────▶ │ store / update    │ ─────────▶ │ InvoiceService   │
  │ (aperçu live   │                  │ convert / markPaid│            │  - numérotation  │
  │  via helper)   │                  │ send / downloadPdf│            │  - totaux (pur)  │
  └────────────────┘                  │ createFromReserv. │            │  - lignes cascade│
          │                           └───────────────────┘            └──────────────────┘
          │ computeInvoiceTotals()            │                                 │
          ▼  (shared/helpers, PUR)            │ PDF/email                       ▼
  ┌────────────────┐                          ▼                         invoices / invoice_lines
  │ mêmes totaux   │                 InvoicePdfService (pdfkit)          invoice_counters
  │ back = front   │                 SendInvoiceEmail (queue)
  └────────────────┘
```

Deux principes structurants :

- **Cœur de calcul pur et partagé** : `computeInvoiceTotals()` vit dans
  `#shared/helpers/invoice_totals` et est appelé **à l'identique** par le backend
  (persistance autoritaire de `subtotal` / `tax_amount` / `total` / `amount` par
  ligne) et par le frontend (aperçu live dans le formulaire). L'`amount` envoyé
  par le client est **toujours ignoré et recalculé** côté serveur.
- **Contrôleurs fins, logique dans les services** : toute la logique métier
  (numérotation, cascade des lignes, conversion, statuts) est dans
  `InvoiceService` ; le PDF dans `InvoicePdfService` ; l'email dans un job de
  queue dédié.

---

## 3. Modèle de données

### `invoices`

Devis **et** factures partagent la même table, discriminés par `kind`.

| Colonne           | Type                                                | Notes                                           |
| ----------------- | --------------------------------------------------- | ----------------------------------------------- |
| `organization_id` | FK organisations, `CASCADE`                         | Scope obligatoire                               |
| `client_id`       | FK clients, **`SET NULL`**, nullable                | Le document survit à la suppression du client   |
| `reservation_id`  | FK boat_reservations, **`SET NULL`**, nullable      | Lien vers la réservation d'origine (#288)       |
| `source_quote_id` | FK **auto-référente** invoices, `SET NULL`, indexée | Facture ← devis converti (#287)                 |
| `kind`            | enum `quote` / `invoice`                            | **Figé après création**                         |
| `number`          | string                                              | `DEV-000001` / `FAC-000001` (voir §4)           |
| `client_name`     | string, nullable                                    | **Snapshot** dénormalisé (lisible même sans FK) |
| `status`          | enum `draft`/`sent`/`paid`/`overdue`/`cancelled`    | Défaut `draft` (voir §6)                        |
| `issued_at`       | date                                                | Date d'émission                                 |
| `due_at`          | date, nullable                                      | Échéance (base du calcul `overdue`)             |
| `paid_at`         | date, nullable                                      | Date de paiement (#287)                         |
| `subtotal`        | decimal(10,2)                                       | Recalculé serveur                               |
| `tax_rate`        | decimal(5,2)                                        | Pourcentage TVA (0–100)                         |
| `tax_amount`      | decimal(10,2)                                       | Recalculé serveur                               |
| `total`           | decimal(10,2)                                       | Recalculé serveur                               |
| `currency`        | string(3), défaut `EUR`                             | Champ libre                                     |
| `notes`           | text, nullable                                      |                                                 |

Contraintes : `UNIQUE(organization_id, kind, number)` + index
`(organization_id, kind, status)` et `(organization_id, issued_at)`.

> **Note decimals** : les montants sont stockés en `decimal` et manipulés côté
> modèle en `string` (précision), convertis en `number` uniquement dans les
> transformers via `Number.parseFloat`.

### `invoice_lines`

| Colonne      | Type                       | Notes                                        |
| ------------ | -------------------------- | -------------------------------------------- |
| `invoice_id` | FK invoices, **`CASCADE`** | Supprimées avec le document                  |
| `label`      | string                     | Description de la ligne                      |
| `quantity`   | decimal(10,2)              |                                              |
| `unit_price` | decimal(10,2)              |                                              |
| `amount`     | decimal(10,2)              | = `round2(quantity × unit_price)`, recalculé |
| `position`   | int                        | Ordre d'affichage (0..n)                     |

### `invoice_counters`

Compteur de numérotation, une ligne par `(organisation, kind)`.

| Colonne           | Type          | Notes                 |
| ----------------- | ------------- | --------------------- |
| `organization_id` | FK, `CASCADE` |                       |
| `kind`            | string        | `quote` / `invoice`   |
| `last_number`     | int, défaut 0 | Dernier numéro alloué |

Contrainte : `UNIQUE(organization_id, kind)`.

---

## 4. Numérotation séquentielle sans trou

Objectif : des numéros **contigus** (aucun trou), **indépendants par type**, sans
remise à zéro annuelle. Réalisé dans **la même transaction** que l'insert du
document (`InvoiceService.#allocateNumber`) :

1. **Garantir la ligne compteur** : `INSERT ... ON CONFLICT (organization_id,
kind) DO NOTHING` (absorbe la course à la toute première création).
2. **Verrouiller et incrémenter** : `SELECT ... FOR UPDATE` sur la ligne
   compteur → sérialise les allocations concurrentes (pas de lecture obsolète
   comme un `MAX(number)+1`).
3. `number = PREFIX[kind] + String(last_number + 1).padStart(6, '0')` avec
   `PREFIX = { quote: 'DEV-', invoice: 'FAC-' }`.

Comme le compteur et le document sont dans la **même transaction**, un rollback
annule aussi l'incrément : **aucun numéro n'est « brûlé »**. Les séquences devis
et factures sont totalement indépendantes.

---

## 5. Calcul des totaux (`computeInvoiceTotals`)

Fonction **pure** partagée (`#shared/helpers/invoice_totals`), politique d'arrondi
documentée volontairement :

- `amount` par ligne = `round2(quantity × unitPrice)` — **arrondi avant de sommer**
- `subtotal` = `round2(Σ amount)` — somme des lignes déjà arrondies
- `taxAmount` = `round2(subtotal × taxRate / 100)` — **une seule base taxable**,
  pas de TVA par ligne
- `total` = `round2(subtotal + taxAmount)`

`create()` et `update()` appellent systématiquement ce helper et persistent
`String(...)` des résultats ; **l'`amount` du payload client est ignoré**. Le
frontend appelle la même fonction en `computed` pour l'aperçu live → l'estimation
affichée correspond exactement à ce qui est stocké.

---

## 6. Cycle de vie & statuts

Statuts : `draft` → `sent` → `paid`, avec `overdue` (retard) et `cancelled`
(annulation) comme états transverses.

```
   draft ──(send)──▶ sent ──(markPaid)──▶ paid
                       │
                       └──(échéance dépassée, non payé, job quotidien)──▶ overdue

   quote (kind=quote) ──(convert)──▶ nouvelle invoice (kind=invoice, source_quote_id)
```

| Transition             | Déclencheur                        | Règles / gardes                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Envoi** (#286)       | `POST /invoices/:id/send`          | `draft → sent` uniquement (payée/annulée non rétrogradée) ; refuse si le client n'a pas d'email                                                                                                                       |
| **Conversion** (#287)  | `POST /invoices/:id/convert`       | Uniquement un `quote` (`NotAQuoteError`), une seule fois (`QuoteAlreadyConvertedError`). Crée une **nouvelle** facture `FAC-`, recopie client/réservation/lignes/TVA/notes, `status=draft`, `source_quote_id` = devis |
| **Paiement** (#287)    | `POST /invoices/:id/pay`           | Uniquement une `invoice` non annulée (`CannotMarkPaidError`) → `status=paid`, `paid_at` horodaté                                                                                                                      |
| **Retard auto** (#287) | Job planifié `MarkOverdueInvoices` | Bascule en `overdue` toute facture `sent`, non payée, `due_at` dépassée. Idempotent                                                                                                                                   |

Le passage en `overdue` est câblé via un **job de queue planifié**
(`app/jobs/mark_overdue_invoices.ts`, cron quotidien `0 6 * * *` Europe/Paris dans
`start/scheduler.ts`) qui appelle `InvoiceService.markOverdueInvoices()`.

---

## 7. Génération PDF & envoi email (#286)

### PDF — `InvoicePdfService`

- pdfkit, format A4, retourne `{ buffer, filename }`.
- **En-tête brandé** : logo + couleurs de l'organisation **si** plan Enterprise
  **et** white-label activé (`PLAN_LIMITS[plan].canWhiteLabel`), sinon branding
  FleetView par défaut (`#1e3a5f`).
- Métadonnées (dates, statut, client), tableau des lignes zébré avec pagination,
  totaux, notes et mentions légales. Tous les libellés via i18n (`invoices.pdf.*`).
- Téléchargement : `GET /invoices/:id/pdf` (inline via `?inline=1`, sinon
  attachment), **org-scopé** et **gaté Enterprise**.

### Email — `SendInvoiceEmail` (job de queue)

> **Point technique clé** : la queue sérialise le payload en **JSON** → **pas de
> Buffer en queue**. Le job **régénère le PDF dans le worker** à partir d'un
> payload minimal `{ invoiceId, organizationId, to, locale, dedupKey }`, résout
> `InvoicePdfService` via le container, construit l'i18n avec
> `i18nManager.locale(locale)`, et attache le PDF via
> `message.attachData(buffer, { filename, contentType: 'application/pdf' })`.

`EmailQueueService.sendInvoice(...)` enfile avec une **clé de dédup unique par
envoi** (composant timestamp) → les renvois sont autorisés. Le contrôleur
transitionne `draft → sent` après l'enfilement.

---

## 8. Devis depuis une réservation (#288)

Raccourci métier : générer un devis pré-rempli depuis une réservation.

- **Action** : bouton « Créer un devis » sur la liste des réservations
  (`FleetReservationList`, Enterprise) → `POST /invoices/from-reservation/:id`.
- **Pré-remplissage** (`InvoiceService.createQuoteFromReservation`) : devis
  brouillon `DEV-` lié à `reservation_id` ; **client résolu par l'email snapshot**
  de la réservation (à défaut, `client_name` texte libre conservé comme snapshot) ;
  **une ligne** tarifée depuis le `total_price` de la réservation (qui reflète
  déjà la tarification #284 quand disponible, sinon le montant saisi).
- **Lien bidirectionnel** :
  - _Réservation → documents_ : colonne « Documents » de la liste des réservations
    (`ReservationsController.index` → `InvoiceService.listLinksByReservationIds`,
    lookup groupé org-scopé), + flag `canCreateQuote`.
  - _Document → réservation_ : la fiche facture transforme la réservation liée en
    lien vers la page des réservations du bateau (`toInvoiceDetail` expose
    `reservationBoatId`).

> **⚠️ Dette assumée (dépendance #275)** : l'issue #288 dépend de #275 (FK
> `client_id` sur `boat_reservations`), **non livré**. En attendant, la résolution
> du client se fait par **email snapshot** (dégradation propre). Quand #275 posera
> la FK, il suffira de basculer sur `reservation.clientId` **sans changer le
> contrat public ni les types**.

---

## 9. Sécurité, gating & isolation

- **Gating Enterprise** : `QuotaService.assertCanManageInvoices(org)` /
  `canManageInvoices(org)` (via `PLAN_LIMITS[plan].canManageInvoices` — `false`
  pour starter/pro, `true` pour enterprise). Un accès non-Enterprise est redirigé
  avec un flash `flash.quota.invoicesExceeded`.
- **ACL** : `InvoicePolicy` (Bouncer) — `create`/`update` pour tout membre de
  l'organisation, **`delete` réservé aux admins** (via le hook `before`).
- **Org-scoping / IDOR** : tout accès passe par
  `getForOrganizationOrFail(org, id)` (ou `findForOrganization` pour les
  réservations) → un id d'une autre organisation renvoie `NotFound` (redirect),
  jamais les données. `client_id` et `reservation_id` fournis au `store`/`update`
  sont **re-résolus contre l'organisation** et ignorés s'ils appartiennent à une
  autre org.

---

## 10. Routes

Toutes sous `middleware.auth()`, préfixe `/invoices` (voir `start/routes/invoices.ts`).

| Méthode & chemin                                 | Action                  | Rôle                                       |
| ------------------------------------------------ | ----------------------- | ------------------------------------------ |
| `GET /invoices`                                  | `index`                 | Liste filtrable/paginée                    |
| `GET /invoices/new`                              | `create`                | Formulaire de création                     |
| `POST /invoices`                                 | `store`                 | Créer un devis/facture                     |
| `POST /invoices/from-reservation/:reservationId` | `createFromReservation` | Devis pré-rempli depuis réservation (#288) |
| `GET /invoices/:id`                              | `show`                  | Fiche détail                               |
| `GET /invoices/:id/edit`                         | `edit`                  | Formulaire d'édition                       |
| `GET /invoices/:id/pdf`                          | `downloadPdf`           | Télécharger le PDF (#286)                  |
| `POST /invoices/:id/send`                        | `send`                  | Envoyer par email (#286)                   |
| `POST /invoices/:id/convert`                     | `convert`               | Convertir un devis en facture (#287)       |
| `POST /invoices/:id/pay`                         | `markPaid`              | Marquer payée (#287)                       |
| `PUT /invoices/:id`                              | `update`                | Modifier (jamais `number`/`kind`)          |
| `DELETE /invoices/:id`                           | `destroy`               | Supprimer (admin uniquement)               |

Toutes les mutations répondent par **redirection Inertia** (pas de JSON) et le
frontend utilise `router.*` / `<Form>` (conventions Inertia du projet).

---

## 11. Internationalisation

- Namespace **`invoices`** (`resources/lang/{en,fr}/invoices.json`) : `pdf.*`,
  `status.*`, `kind.*`, `columns.*`, `filters.*`, `fields.*`, `lines.*`,
  `totals.*`, `show.*`, `actions.*`, `fromReservation.*`.
- Namespace **`flash`** (backend) : `flash.invoices.{created,updated,deleted,
notFound,sent,noClientEmail,converted,notAQuote,alreadyConverted,paid,
cannotMarkPaid,quoteFromReservation}` + `flash.quota.invoicesExceeded`.
- Côté réservations : `reservations.actions.createQuote`,
  `reservations.columns.documents`.
- Toutes les clés sont présentes dans **les deux locales** (`en` + `fr`).

---

## 12. Fichiers clés

| Rôle              | Fichier                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| Contrôleur        | `app/controllers/invoices_controller.ts`                                         |
| Service (métier)  | `app/services/invoice_service.ts`                                                |
| Service PDF       | `app/services/invoice_pdf_service.ts`                                            |
| Job email         | `app/jobs/send_invoice_email.ts`                                                 |
| Job retard        | `app/jobs/mark_overdue_invoices.ts`                                              |
| Enfilement email  | `app/services/email_queue_service.ts` (`sendInvoice`)                            |
| Cœur pur (totaux) | `shared/helpers/invoice_totals.ts`                                               |
| Modèles           | `app/models/invoice.ts`, `invoice_line.ts`, `invoice_counter.ts`                 |
| Types partagés    | `shared/types/invoice.ts`                                                        |
| Validators        | `app/validators/invoice.ts`                                                      |
| Transformers      | `app/transformers/invoice_transformer.ts`                                        |
| Erreurs métier    | `app/exceptions/invoice_errors.ts`                                               |
| Policy (ACL)      | `app/policies/invoice_policy.ts`                                                 |
| Routes            | `start/routes/invoices.ts`                                                       |
| Frontend          | `inertia/pages/invoices/{index,form,show}.vue` + `inertia/components/invoices/*` |

---

## 13. Tests

- **Unit** : `tests/unit/helpers/invoice_totals.spec.ts` (arrondis, TVA 0/20 %,
  quantités fractionnaires).
- **Fonctionnels** (`tests/functional/invoices/`) :
  - `invoices.spec.ts` — CRUD, numérotation contiguë par kind, org-scoping/IDOR,
    totaux persistés (`amount` falsifié ignoré), cascade des lignes, gating.
  - `invoice_pdf_email.spec.ts` — buffer `%PDF` valide, téléchargement, IDOR,
    gating, envoi → `sent` + flash, refus sans email.
  - `send_invoice_email_job.spec.ts` — exécution directe du job → email envoyé
    avec pièce jointe PDF (chemin non couvert en fonctionnel car la queue `sync`
    ne tourne pas pendant la requête HTTP).
  - `invoice_lifecycle.spec.ts` — conversion, gardes, paiement, `markOverdueInvoices`.
  - `invoice_from_reservation.spec.ts` — pré-remplissage, résolution client par
    email, lien bidirectionnel, gating.
- **Front (Vitest)** : `tests/inertia/invoice_show_actions.spec.ts`,
  `fleet_reservation_list.spec.ts` (boutons convertir/payer/créer-devis + liens).

---

## 14. Hors périmètre / évolutions possibles

- **#275** (FK `client_id` sur les réservations) : remplacerait la résolution du
  client par email (§8) par une FK directe. Complète le CRM (épic #108).
- Relance email automatique des factures en retard (`overdue`) — évoquée comme
  optionnelle en #287, non implémentée.
- Statuts en machine à états stricte (actuellement `status` reste librement
  settable via `update` en dehors des transitions dédiées).
