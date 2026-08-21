# 2026-06-11 — Relances maintenance — tâches en retard, moteur, inspection bateau (PR 3/3)

**Nouvelle fonctionnalité — Alertes maintenance**

Implémentation des 3 relances maintenance dans `ReminderEmailService`.

**Backend :**

- `sendOverdueTaskReminders()` : tâches ouvertes avec `dueAt < aujourd'hui` → email aux admins de chaque organisation avec la liste des tâches en retard (toutes catégories)
- `sendEngineTaskReminders()` : tâches ouvertes avec `subject = 'engine'` et `dueAt` dans les 30 prochains jours → email de rappel moteur par admin
- `sendBoatCheckReminders()` : tâches ouvertes avec `subject = 'boat'` et `dueAt` dans les 30 prochains jours → email d'inspection bateau par admin
- `EmailQueueService` : 3 nouvelles méthodes (`sendReminderOverdueTasks`, `sendReminderEngineTasks`, `sendReminderBoatCheckTasks`) avec templates HTML bilingues (FR/EN), tableau tâche/bateau/échéance, CTA vers `/maintenance`
- Jointure via `preload('boat')` pour récupérer `organizationId` et grouper les tâches par organisation
- Dedup par `correlationId` incluant les IDs des tâches — évite les doublons quotidiens

---
