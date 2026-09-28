# 2026-09-28 — Relances automatiques des factures en retard (#878)

Le job `MarkOverdueInvoices` (06:00) passait les factures échues en `overdue`,
puis plus rien : personne n'écrivait au client. FleetAi relance désormais à la
place de l'organisation, et la prévient du passage en retard.

## Relances automatiques

- Job `SendInvoiceReminders` (cron **06:30** Europe/Paris, après le passage en
  retard) → `InvoiceReminderService.runDaily`. Pour chaque facture `overdue`
  d'une organisation qui a activé les relances et dont le module CRM &
  Facturation est actif, envoie le **palier atteint** s'il n'a pas déjà été
  traité : J+3, J+10, J+30 après l'échéance (`INVOICE_REMINDER_TIERS`,
  `shared/constants/invoice_reminders.ts`, jours comptés à Paris).
- Un palier ne part qu'une fois : facture verrouillée `FOR UPDATE`,
  `invoices.last_reminder_tier` avancé dans la même transaction, e-mail
  dédupliqué par la clé `invoice_reminder:<id>:<palier>`. Une facture
  découverte à J+40 reçoit directement la relance ferme, pas trois e-mails.
- E-mail `SendInvoiceReminderEmail` (file `emails`, gabarit
  `emails/invoice_reminder.edge`, un gabarit unique paramétré par palier) :
  ton qui monte (rappel, deuxième rappel, dernière relance), **reste à payer**
  net des avoirs (#877), message libre de l'organisation, mention des
  pénalités de retard sur la dernière relance, bouton « Payer en ligne » (#876),
  facture PDF jointe, branding marque blanche. Une facture réglée entre la
  mise en file et l'envoi n'est pas relancée.
- Jamais de relance vers un client absent, sans e-mail, anonymisé (RGPD) ou
  blacklisté : le palier est inscrit « non envoyé » (motif), et les
  administrateurs reçoivent une notification `invoice.reminder_skipped` à la
  place. Une relance envoyée par le job notifie `invoice.reminder_sent`.

## Organisation prévenue

- `MarkOverdueInvoices` notifie chaque administrateur, le jour même, des
  factures qu'il vient de basculer : `invoice.overdue` (in-app + push, lien
  vers la facture). `InvoiceService.flagOverdueInvoices` rend les factures
  basculées ; `markOverdueInvoices` garde sa signature (nombre).

## Fiche facture et liste

- Bloc « Relances » (`InvoiceRemindersCard.vue`) sur une facture émise :
  nombre et date de la dernière relance, historique (palier, automatique ou
  manuelle, auteur, motif d'une relance non envoyée), bouton **« Relancer
  maintenant »** et interrupteur **« Ne plus relancer »** (client en litige).
- `POST /invoices/:id/reminders` (`invoices.reminders.store`, e-mail vérifié
  requis) : relance manuelle au palier suivant (plafonné au dernier). Refusée
  hors retard ou relances désactivées (`CannotRemindInvoiceError`), et sans
  destinataire possible (`InvoiceReminderRecipientError`, motif dans le flash).
- `PATCH /invoices/:id/reminders` `{ disabled }` (`invoices.reminders.update`).
- Liste `/invoices` : badge « Relancée ×N ».

## Réglages

- Carte « Relances des factures en retard » dans `/settings/billing`
  (`SettingsInvoiceReminders.vue`) : activation (désactivée par défaut),
  message ajouté à chaque relance, mention des pénalités (1 000 caractères
  max chacun). `PATCH /settings/billing/invoice-reminders`
  (`settings.billing.invoiceReminders.update`), réservé à `manageBilling`.

## Modèle

- Migration `1869000000000_add_invoice_reminders` :
  - `organizations.invoice_reminders_enabled` (bool, défaut `false`),
    `invoice_reminder_message`, `invoice_late_penalty_note` (text) ;
  - `invoices.reminder_count` (relances envoyées), `last_reminder_tier`
    (dernier palier traité, envoyé ou non), `last_reminder_at`,
    `reminders_disabled` ;
  - table `invoice_reminders` (facture, palier, `automatic`/`manual`,
    `sent`/`skipped`, motif, auteur) — l'historique de la fiche.
- Journal d'audit : `invoice.reminder_sent`, `invoice.reminders_disabled`,
  `invoice.reminders_enabled`, `invoice_reminders.update`.
- Copilote : entrée `invoice-reminders` dans `product_knowledge.ts`.

## Hors périmètre

- Paliers configurables par organisation et texte différent par palier (les
  paliers sont une constante, le message libre est commun).
- Aperçu de l'e-mail dans les réglages, copie de la relance à l'organisation
  (la notification in-app en tient lieu).
- Calcul automatique des pénalités de retard (mention textuelle seulement).
