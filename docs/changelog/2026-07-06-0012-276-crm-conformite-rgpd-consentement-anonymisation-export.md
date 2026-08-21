# 2026-07-06 — [#276] CRM : conformité RGPD (consentement, anonymisation, export)

Lot 4/4 de l'epic CRM léger (#108) — **clôt l'epic**. Ajoute le suivi du consentement, le droit à l'effacement (anonymisation) et la portabilité (export) sur la fiche client.

- **Consentement** : champ `gdprConsent` (booléen) dans les validators/payloads create & update ; `ClientService` pose/efface `gdpr_consent_at` (posé une seule fois, conservé si déjà donné). Case à cocher dans `ClientForm.vue`, état affiché sur la fiche.
- **Anonymisation** (`ClientService.anonymize`, idempotente, transactionnelle) : neutralise les PII (nom → « Client anonymisé », email/téléphone/adresse/permis/notes → `null`), supprime les documents (Cloudinary + quota), et anonymise le **snapshot texte** des réservations liées tout en conservant `client_id` (intégrité référentielle). Nouvelle colonne `clients.anonymized_at` (migration `1815000000000`) : marque l'état, verrouille la ré-édition (`ClientAlreadyAnonymizedError` → flash), masque les actions et affiche un badge « Anonymisé ».
- **ACL** : capacité `clients.anonymize` **admin-only** (`shared/types/permissions.ts`, `ClientPolicy.anonymize`).
- **Export RGPD** (portabilité) : `GET /clients/:id/export` renvoie un JSON (client + historique réservations + métadonnées documents) en pièce jointe ; `ClientService.exportData`.
- **Routes** : `POST /clients/:id/anonymize`, `GET /clients/:id/export`.
- **i18n** : `clients.gdpr.*` (en + fr) + `flash.clients.anonymized` / `alreadyAnonymized`.
- **Tests** : fonctionnels `client_anonymize.spec.ts` (PII, snapshot réservation, idempotence, blocage ré-édition, admin-only, IDOR, gating) et `client_gdpr.spec.ts` (consentement create/update, export) ; Vitest case de consentement `ClientForm`.
