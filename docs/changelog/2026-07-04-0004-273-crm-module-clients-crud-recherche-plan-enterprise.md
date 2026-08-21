# 2026-07-04 — [#273] CRM : module clients (CRUD, recherche, plan Enterprise)

**Socle du CRM léger (epic #108, lot 1/4)** : nouvelle ressource `clients` org-scopée, réservée au plan Enterprise.

- **Base de données** : table `clients` (`organization_id`, `first_name`, `last_name`, `email`, `phone`, `address`, `navigation_permit_number`, `navigation_permit_type`, `status` enum `active`/`inactive`/`blacklisted`, `notes`, `gdpr_consent_at` — posé pour le lot RGPD, timestamps) + index `(organization_id, email)`
- **Backend** : `app/models/client.ts`, `app/services/client_service.ts` (CRUD org-scopé + `search()` serveur `whereILike` nom/email + filtre statut + pagination), `app/validators/client.ts`, `app/policies/client_policy.ts` (suppression admin-only), `app/exceptions/client_errors.ts`, `app/controllers/clients_controller.ts`, routes `/clients` (`start/routes/clients.ts`)
- **Gating Enterprise** : flag `canManageClients` dans `shared/types/plan.ts` (Enterprise uniquement), `quotaService.assertCanManageClients` + `QuotaFeature 'clients'` ; accès refusé (flash + redirect) hors Enterprise
- **Frontend** : page `/clients` (recherche debounced + filtre statut + création/édition inline + badge de statut + suppression confirmée), composants `ClientForm` / `ClientListToolbar` / `ClientStatusBadge`, item de menu « Clients » visible uniquement en Enterprise
- **i18n** : namespaces `clients` (en + fr), `nav.clients`, `flash.clients.*`, `flash.quota.clientsExceeded`
- **Tests** : 14 fonctionnels (CRUD, org-scoping/IDOR, recherche, refus non-Enterprise) + 8 Vitest (`ClientForm`, `ClientStatusBadge`)

Les lots suivants (documents #274, lien réservations + blacklist #275, RGPD #276) s'appuient sur ce socle.
