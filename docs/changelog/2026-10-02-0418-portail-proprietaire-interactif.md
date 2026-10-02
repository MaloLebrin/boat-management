# Portail propriétaire interactif (#890)

**Date** : 2026-10-02

Le portail `boat_owner` n'est plus une vitrine en lecture seule : il montre le
dossier du bateau confié, ouvre la demande au gestionnaire et l'accord sur un
devis, et prévient le propriétaire de ce qui se passe sur son bateau. Détail
complet : `docs/domain/owner-portal.md`.

## Lecture étendue

`GET /owner/boats/:id` passe six nouvelles props, toutes bornées par
`app/transformers/boat_owner_transformer.ts` (clés figées par
`tests/functional/owner/owner_portal.spec.ts`) :

- `dashboard` : dépenses partagées sur 12 mois et par catégorie, prochaines
  échéances (documents, tâches datées, 90 jours), dernière sortie, état du
  bateau, devis à valider ;
- `documents` (sans coût ni fichier), `expenses` (seulement les dépenses
  partagées), `incidents` (nature, état, dates), `trips` (sorties clôturées,
  sans équipage ni notes), `requests` (demandes et devis).

Les factures montrées incluent désormais celles **adressées au propriétaire**
(client CRM portant son e-mail), en plus de celles des locations du bateau.

## Demandes

`POST /owner/boats/:id/requests` (titre, description facultative) crée une
tâche de maintenance ouverte marquée `requested_by_owner_id`, journalisée
(`maintenance_task.owner_request`) et notifiée à l'équipe
(`owner.request_created`). Le propriétaire suit son statut : reçue, planifiée,
faite.

## Accord sur un devis

Une tâche ouverte dont le coût prévu atteint 500 €, sur un bateau qui a un
propriétaire, attend son accord (`owner_approval_status = 'pending'`,
notification `owner.approval_requested`). `POST
/owner/boats/:id/tasks/:taskId/approve|reject` enregistre la décision une seule
fois, la journalise (`maintenance_task.owner_approve|owner_reject`) et prévient
l'équipe (`owner.approval_decided`). Un nouveau coût redemande l'accord.

## Notifications au propriétaire

Nouveaux types (famille `fleet`, poussables) : `owner.maintenance_done`,
`owner.incident_created`, `owner.approval_requested`,
`owner.document_expiring` (scan quotidien), `owner.invoice_sent` (facture
passée de brouillon à envoyée vers son e-mail). Seuls les propriétaires du
bateau sont visés ; l'envoi de facture passe désormais par
`InvoiceService.markSent`, qui journalise aussi l'envoi.

## Côté gestionnaire

- Budget : case « Visible du propriétaire » sur une dépense
  (`visibleToOwner`, faux par défaut).
- Tâches : le résumé d'ordre de travail affiche « Demande du propriétaire » et
  l'état de l'accord.

## Données

Migration `1883000000000_add_owner_portal_columns` :
`boat_budget_entries.visible_to_owner`,
`boat_maintenance_tasks.requested_by_owner_id`, `owner_approval_status`,
`owner_approval_decided_at`, `owner_approval_decided_by`.

## Hors périmètre

Photo jointe et fil de commentaires sur une demande, rapport mensuel e-mail en
version propriétaire, paiement en ligne par le propriétaire.
