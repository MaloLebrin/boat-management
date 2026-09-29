# 2026-09-29 — Alertes d'expiration des certifications d'équipage (#882)

L'app stockait les certifications des équipiers (permis, visite médicale, STCW,
CRR…) avec leur date d'expiration mais n'alertait jamais, alors qu'elle le fait
pour les documents du bateau et l'armement de sécurité. Un équipier au
certificat expiré met le loueur en faute devant l'assurance et les Affaires
maritimes.

- **Règle d'état partagée.** `shared/helpers/crew_certification.ts` :
  `crewCertificationStatus` (`valid` / `expiring_soon` à 60 jours / `expired` /
  `undated`), `crewCertificationAlertWindow` (fenêtres 60/30/7 jours) et
  `worstCrewCertificationStatus`. `CrewCertificationRow.status`,
  `CrewMemberRow.certificationStatus` et `CrewMemberOption.certificationStatus`
  en découlent.
- **Notifications.** Nouveaux types `crew_certification.expiring_soon`
  (`warning`) et `crew_certification.expired` (`error`, poussable).
  `NotificationScanService` crée une notification par équipier et par état,
  adressée aux admins et à l'équipier lui-même quand son e-mail est celui d'un
  membre de l'organisation, lien `/crew` s'il y a accès. Anti-doublon par
  fenêtre (`metadata.crewAlertKey`) : une alerte en entrant dans les fenêtres
  60, 30 et 7 jours, puis une par mois tant que la certification est échue.
  Titre et corps dans la langue du destinataire.
- **E-mail.** `ReminderEmailService.sendCrewCertificationReminders`, ajouté au
  job quotidien `SendReminderEmails` : un e-mail par admin, dans sa langue,
  listant les certifications qui expirent dans exactement 60, 30 ou 7 jours
  (gabarit `reminder_crew_certification_expiry.edge`, clés `crew.emails.reminder.*`).
- **Écrans.** Page `/crew` : badge par certification sur la fenêtre de 60 jours
  (« Expire dans N jours », « Expirée depuis N jours ») et badge d'équipier à
  côté du nom. Journal de bord : le sélecteur d'équipage signale les équipiers
  au certificat expiré ou à renouveler, un membre embarqué au certificat expiré
  porte un badge et un avertissement s'affiche — jamais bloquant.
- **Tableau de bord.** Widget de galerie « Certifications à renouveler »
  (`crew_certifications`, prop différée `crewCertifications`, disponible avec
  `crew.create`) : comptes échues / à 60 jours et les cinq plus urgentes.
- **Assistant.** Le digest de flotte liste les certifications échues ou à
  60 jours (« qui peut skipper samedi ? ») ; entrée
  `crew-certification-alerts` dans la base de connaissance.
- **Tests.** Unitaires du helper, fonctionnels du scan (regroupement, équipier
  destinataire, dédup par fenêtre, isolation), intégration du rappel e-mail
  (fake `EmailQueueService`), du `CrewService` et snapshots des payloads
  e-mail, Vitest du badge, du sélecteur et du widget ; énumérations du
  tableau de bord mises à jour.
- **Docs.** `docs/domain/crew.md`, `docs/domain/notifications.md`,
  `docs/domain/dashboard.md`.
