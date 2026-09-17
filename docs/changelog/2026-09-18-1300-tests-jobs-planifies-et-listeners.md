# 2026-09-18 — Tests : les tâches planifiées et les listeners (#699)

L'application fait tourner **7 tâches planifiées** (`start/scheduler.ts`) et réagit à 11 événements
métier. C'est le travail qui s'exécute quand personne ne regarde — e-mails de rappel, factures
passées en retard, purge des journaux d'audit, réinitialisation du compte démo. **Les sept crons
étaient sans aucun test**, et 10 jobs sur 17, 6 listeners sur 11 avec eux.

- **Le trou n'était pas là où on le croyait.** Chaque cron **délègue** à un service, et les services,
  eux, sont bien couverts — `tests/functional/notifications/scan.spec.ts` teste `NotificationScanService`
  en profondeur, mais en l'instanciant **à la main** : il ne passe jamais par le job. Un
  `ScanFleetNotifications.execute()` vidé de son corps aurait passé la totalité de la suite. Ce qui
  manquait, c'était le **câblage** — et c'est vrai des sept.
- **Deux crons détruisent des données** et tournaient à l'aveugle : `PurgeAuditLogs` (03:00) et
  `ResetDemoData` (04:00). La sûreté du second tient entièrement à la portée de ses `where`
  (`DEMO_EMAIL`, `DEMO_ORG_SLUG`) ; un `where` relâché effacerait des organisations clientes à 04:00.
  C'est désormais figé par un test qui crée une organisation réelle et vérifie qu'elle survit.
- **`markFailed` ne libère pas la clé de déduplication.** L'issue #699 attendait qu'« un échec libère
  la clé » : il ne la libère pas. `markFailed` passe la ligne en `failed` et y écrit l'erreur, mais la
  ligne subsiste, donc la contrainte d'unicité refuse tout ré-enfilement. Un travail échoué n'est pas
  re-programmable sans intervention. Comportement figé tel quel, pour qu'il soit vu avant d'être changé.
- **La déduplication des alertes de quota ne couvre que l'e-mail.** Le `correlationSuffix`
  (`orgId:percent:yyyy-MM`) empêche le second e-mail du mois, mais le listener appelle ensuite
  `notificationService.create()` — et non `createIfNotRecent()` comme le scan de flotte. Un seuil
  franchi deux fois crée donc deux notifications in-app. Caractérisé, pas corrigé.
- **Les neuf campagnes de rappel ne sont pas isolées.** `SendReminderEmails.execute()` les enchaîne
  sans `try/catch` : une campagne qui lève arrête les suivantes, et le `failed()` du job se contente
  de logger. Figé par un test qui, s'il tombe un jour, signalera qu'une isolation a été ajoutée.
- **`GenerateExport` est un placeholder** — `execute()` logge et marque sa clé, sans produire
  d'export. L'issue le désignait comme « export silencieusement vide » : c'est exact au sens propre.
  Signalé plutôt que simulé ; seule sa clé de déduplication, elle bien réelle, est testée.
- **Une garde** — `tests/unit/hygiene/scheduled_jobs_covered.spec.ts`, même forme que celles de #687,
  #689 et #690 : tout job de `app/jobs/` est nommé par un spec, tout cron du scheduler l'est aussi, et
  l'ordre des deux crons IA (suggestions à 05:00 **avant** le scan de 07:00, contrat écrit en
  commentaire dans `start/scheduler.ts`) est vérifié. Deux exemptions, chacune motivée et rattachée à
  son issue : `process_media` (#692) et `process_boat_maintenance_import` (#693).
- **Tests.** 40 cas : 7 fichiers de jobs (`tests/integration/jobs/`), 3 de listeners
  (`tests/integration/listeners/`), et 6 pour la garde.
- **Non couvert, et pourquoi.** L'autorisation du canal Transmit (`notifications/:userId`) reste sans
  test : `/__transmit/subscribe` répond **400 dans les deux cas** tant qu'aucun flux SSE n'est
  enregistré pour l'`uid`. Un test qui asserterait « 400 sur le canal d'autrui » passerait au vert
  sans rien prouver, puisque le cas autorisé renvoie le même code. À couvrir avec un vrai flux SSE,
  hors de la portée de `@japa/api-client`.
- **Non-vacuité.** Supprimer un spec de job ⇒ la garde nomme le job **et** le cron orphelins ;
  déplacer les suggestions IA à 09:00 ⇒ le contrat d'ordonnancement tombe. Un premier jet de la garde
  se comptait elle-même comme couvrante, parce que sa propre docstring citait un chemin `#jobs/…` en
  exemple : la suppression d'un spec ne la faisait alors **pas** tomber. Le fichier s'exclut désormais
  de son propre balayage, comme la garde de #689.
