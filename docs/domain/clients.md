# Domaine — Clients (CRM léger)

> Documentation du module **clients** (CRM léger) et de son **lien avec les
> réservations** : rattachement d'une réservation à une fiche client, historique
> côté client et blocage des clients blacklistés. Couvre l'epic #108 (CRM), en
> particulier le lot **#275** (lien réservation ↔ client).
>
> Modules liés : [`reservations-and-pricing.md`](./reservations-and-pricing.md)
> (réservations) et [`invoicing.md`](./invoicing.md) (le client d'un devis/facture).

---

## 1. Objectif fonctionnel

Gérer un **répertoire de clients** par organisation et le relier au reste du
domaine (réservations, devis/factures) :

1. **CRUD clients** : coordonnées, permis de navigation, statut, notes, consentement RGPD.
2. **Rattacher une réservation à un client** (optionnel) tout en conservant les
   informations client en **snapshot texte** sur la réservation.
3. **Historique** : voir toutes les réservations d'un client sur sa fiche.
4. **Blocage blacklist** : refuser toute réservation pour un client `blacklisted`.

Le module clients est une **fonctionnalité du plan Enterprise** (gating
`canManageClients`). Les réservations, elles, restent disponibles pour toute
organisation ; le rattachement à un client est un **plus** optionnel.

---

## 2. Modèle de données

### `clients`

| Colonne                    | Type                                       | Notes                      |
| -------------------------- | ------------------------------------------ | -------------------------- |
| `organization_id`          | FK organisations, `CASCADE`                | Scope obligatoire          |
| `first_name` / `last_name` | string                                     | `fullName` = concaténation |
| `email`                    | string, nullable                           |                            |
| `phone`                    | string, nullable                           |                            |
| `address`                  | string, nullable                           |                            |
| `navigation_permit_number` | string, nullable                           |                            |
| `navigation_permit_type`   | enum, nullable                             |                            |
| `status`                   | enum `active` / `inactive` / `blacklisted` | Défaut `active`            |
| `notes`                    | text, nullable                             |                            |
| `gdpr_consent_at`          | datetime, nullable                         | Consentement RGPD          |

### Lien sur `boat_reservations` (#275)

| Colonne     | Type                                            | Notes                  |
| ----------- | ----------------------------------------------- | ---------------------- |
| `client_id` | FK `clients`, **`SET NULL`**, nullable, indexée | Rattachement optionnel |

Les champs `client_name` / `client_email` / `client_phone` de la réservation sont
**conservés comme snapshot dénormalisé** : la réservation reste lisible même si le
client est délié ou supprimé (`SET NULL`).

> **Choix de conception** : le modèle `BoatReservation` expose `clientId` en
> **colonne simple, sans `@belongsTo(() => Client)`**. Déclarer la relation
> faisait dépasser la limite de profondeur du typage `preload` de Lucid (même
> famille de problème que les relations auto-référentes des factures) et cassait
> le typage d'autres relations. Le client est donc résolu par **requête directe
> org-scopée** dans le service, ce qui suffit à tous les usages.

---

## 3. Lien réservation ↔ client (#275)

### Résolution & org-scoping

À la **création** et à la **mise à jour** d'une réservation,
`BoatReservationService.#resolveClientId(organizationId, clientId)` :

- retourne `null` si aucun client n'est fourni **ou** si l'id n'appartient pas à
  l'organisation (un `client_id` d'une autre org est **silencieusement ignoré** —
  protection IDOR, cohérent avec les factures) ;
- lève `ReservationBlacklistedClientError` si le client est **blacklisté**.

### Blocage blacklist

```
   réservation (create / update) ─▶ #resolveClientId ─┬─ client absent / autre org ─▶ client_id = null
                                                       ├─ client actif/inactif      ─▶ client_id = id
                                                       └─ client blacklisté         ─▶ ❌ ReservationBlacklistedClientError
```

Le contrôleur mappe l'erreur en flash `flash.reservation.blacklistedClient` et
refuse l'opération (aucune réservation créée / aucune modification appliquée).

### Historique côté client

- `BoatReservationService.listForClient(orgId, clientId)` : toutes les
  réservations du client dans l'organisation, plus récentes d'abord, bateau
  préchargé.
- `ClientsController.show` (`GET /clients/:id`, **gaté Enterprise**) rend la fiche
  client `inertia/pages/clients/show.vue` : informations + tableau de l'historique
  des réservations. Accessible via le bouton « Voir » de la liste des clients.

### Synergie facturation (#288)

`InvoiceService.createQuoteFromReservation` privilégie désormais le
`reservation.clientId` (FK) pour rattacher le devis au client, et ne retombe sur
la résolution par **email snapshot** que si la FK est absente. Le lien direct
livré ici remplace donc la dépendance email notée en #288.

---

## 4. Frontend

- **Sélecteur de client** (optionnel) dans `ReservationForm.vue` et
  `ReservationEditModal.vue` : `clientOptions` (via
  `ClientService.listOptions(orgId)`) est propagé depuis `boats/reservations.vue`
  → `ReservationList` → modale. Sélectionner un client remplit automatiquement le
  **nom snapshot** ; le `client_id` est envoyé au submit (converti en nombre via
  `form.transform`, `null` si « Aucun »).
- **Fiche client** `inertia/pages/clients/show.vue` : en-tête (nom + badge de
  statut), carte informations, section « Historique des réservations » (ou état
  vide). Lien « Voir » ajouté sur chaque ligne de `clients/index.vue`.

---

## 5. Routes

Sous `middleware.auth()` (voir `start/routes/clients.ts`) :

| Méthode & chemin      | Action    | Rôle                                                    |
| --------------------- | --------- | ------------------------------------------------------- |
| `GET /clients`        | `index`   | Liste filtrable/paginée                                 |
| `GET /clients/:id`    | `show`    | Fiche client + historique réservations (#275)           |
| `POST /clients`       | `store`   | Créer un client                                         |
| `PUT /clients/:id`    | `update`  | Modifier un client                                      |
| `DELETE /clients/:id` | `destroy` | Supprimer (admin) → délie les réservations (`SET NULL`) |

Réservations concernées : `POST` / `PATCH /boats/:boatId/reservations` acceptent
désormais un `clientId` optionnel.

---

## 6. Sécurité & gating

- **Gating Enterprise** : `QuotaService.assertCanManageClients` /
  `canManageClients` (via `PLAN_LIMITS[plan].canManageClients`). Le module clients
  (et la fiche `show`) est réservé à Enterprise.
- **ACL** : `ClientPolicy` (Bouncer) — `delete` réservé aux admins.
- **Org-scoping / IDOR** : toute lecture/écriture passe par
  `getForOrganizationOrFail` / `#resolveClientId` org-scopés ; un id d'une autre
  organisation renvoie `NotFound` (redirect) ou est ignoré.

---

## 7. i18n

- Namespace **`clients`** : `columns.*`, `fields.*`, `status.*`, `form.*`,
  `view`, `show.{back,info,reservationHistory,noReservations}`.
- Namespace **`reservations`** : `form.client`, `form.noClientOption`.
- Namespace **`flash`** : `flash.reservation.blacklistedClient`,
  `flash.clients.*`.
- Clés présentes dans **les deux locales** (`en` + `fr`).

---

## 8. Fichiers clés

| Rôle                 | Fichier                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Contrôleur clients   | `app/controllers/clients_controller.ts` (dont `show`)                                                                                  |
| Service clients      | `app/services/client_service.ts` (`listOptions`, `getForOrganizationOrFail`)                                                           |
| Service réservations | `app/services/boat_reservation_service.ts` (`#resolveClientId`, `listForClient`)                                                       |
| Transformer client   | `app/transformers/client_transformer.ts`                                                                                               |
| Erreur métier        | `app/exceptions/reservation_errors.ts` (`ReservationBlacklistedClientError`)                                                           |
| Modèle               | `app/models/boat_reservation.ts` (`clientId`)                                                                                          |
| Types partagés       | `shared/types/client.ts`, `shared/types/reservation.ts`                                                                                |
| Frontend             | `inertia/pages/clients/{index,show}.vue`, `inertia/components/reservations/{ReservationForm,ReservationEditModal,ReservationList}.vue` |

---

## 9. Tests

- **Fonctionnels** `tests/functional/boats/reservation_client_link.spec.ts` :
  lien à la création ; refus blacklist (création + mise à jour) ; `client_id`
  cross-org ignoré ; suppression d'un client → `client_id` NULL + snapshot
  conservé ; historique exposé sur la fiche client.
- **Front (Vitest)** : sélecteur de client dans le formulaire de réservation
  (`reservation_form.spec.ts`).

---

## 10. Hors périmètre / évolutions

- Autres lots CRM de l'epic #108 (import/export CSV, etc.).
- Documentation exhaustive du CRUD clients de base (#273) — cette page se
  concentre sur le lien réservation ↔ client (#275).
