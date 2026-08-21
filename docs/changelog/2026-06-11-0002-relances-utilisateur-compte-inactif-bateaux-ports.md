# 2026-06-11 — Relances utilisateur — compte inactif, bateaux/ports incomplets, inactivité (PR 2/3)

**Nouvelle fonctionnalité — Rétention utilisateur**

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
