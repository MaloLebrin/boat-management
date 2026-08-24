# 2026-06-11 — Infrastructure emails de relance (PR 1/3)

**Nouvelle fonctionnalité — Rétention utilisateur**

Pose les fondations pour les emails de relance automatiques envoyés quotidiennement.

**Backend :**

- Migration : `last_login_at` ajouté sur la table `users` (nullable)
- Tracking : `lastLoginAt` mis à jour à chaque connexion (`SessionController.store`) et création de compte (`NewAccountController.store`)
- `app/services/reminder_email_service.ts` : service orchestrateur avec 7 méthodes (squelettes) — `sendInactiveAccountReminders`, `sendIncompleteBoatReminders`, `sendIncompletePortReminders`, `sendInactiveLoginReminders`, `sendOverdueTaskReminders`, `sendEngineTaskReminders`, `sendBoatCheckReminders`
- `app/jobs/send_reminder_emails.ts` : job queue `emails` qui exécute toutes les relances en séquence
- `start/scheduler.ts` : planification cron quotidienne à 08h00 (Europe/Paris), id `daily-reminder-emails`
- `shared/types/reminder.ts` : types partagés (`ReminderKind`, `ReminderTaskItem`, `ReminderBoatItem`, `ReminderPortItem`)
  Implémentation des 4 relances liées au cycle de vie utilisateur dans `ReminderEmailService`.

**Backend :**

- `sendInactiveAccountReminders()` : organisations sans bateau créées il y a > 7 jours → email aux admins pour ajouter leur flotte
- `sendIncompleteBoatReminders()` : bateaux avec ≥ 3 champs clés null (type, immatriculation, longueur, année, fabricant, modèle) → email groupé par admin avec liste des bateaux à compléter
- `sendIncompletePortReminders()` : ports sans ville ou sans pays → email groupé par admin avec liste des ports à compléter
- `sendInactiveLoginReminders()` : utilisateurs sans connexion depuis > 30 jours → email de réengagement individuel
- `EmailQueueService` : 4 nouvelles méthodes d'envoi (`sendReminderInactiveAccount`, `sendReminderIncompleteBoats`, `sendReminderIncompletePorts`, `sendReminderInactiveLogin`) avec templates HTML bilingues (FR/EN) et dedup
- Ciblage admin via `OrganizationMembership` (role `admin`) — 1 email par admin avec liste groupée
- Dédup par `correlationId` incluant les IDs des éléments concernés — évite les doublons quotidiens

---

---
