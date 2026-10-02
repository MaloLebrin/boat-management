# Préférences de notifications par famille et par canal, nouveaux événements (#888)

**Date** : 2 octobre 2026

## Préférences

`/settings/notifications` gagne, au-dessus des appareils push, une matrice
**familles × canaux** :

- familles : Flotte & maintenance, Location & clients, Facturation, Équipe & compte, IA ;
- canaux : dans l'app, push, e-mail, avec « Tout couper / Tout activer » par colonne ;
- heures calmes : pas de push de 22h à 7h, dans le fuseau du navigateur ;
- résumé quotidien : les e-mails non urgents sont regroupés et envoyés à 8h.

Tant que l'utilisateur n'a rien enregistré, ce sont les défauts de son rôle qui
s'appliquent : l'admin reçoit tout, le membre rien de la facturation, le
mécanicien rien de la location ni de la facturation. L'e-mail n'est jamais
coché d'office.

- `PUT /settings/notifications/preferences` (`settings.notifications.preferences`).
- `GET` / `POST /notifications/unsubscribe/:userId/:family`
  (`notifications.unsubscribe` / `.confirm`) : désinscription en un clic,
  par URL signée sans session. Le `GET` affiche une confirmation, le `POST`
  coupe l'e-mail de la famille.

## Dispatcher

`NotificationService.create()` lit la préférence avant chaque canal :

- in-app coupé : la notification est écrite (`notifications.in_app = false`)
  pour l'anti-doublon des scans, mais n'est ni diffusée ni listée ;
- push : types poussables seulement, retenu pendant les heures calmes ;
- e-mail : envoi immédiat (`emails/notification.edge`), ou mise en attente
  (`notifications.email_digest_pending`) si le résumé est activé ; une
  notification `error` part toujours tout de suite.

Le job horaire `SendNotificationDigests` (`5 * * * *`) envoie le résumé aux
utilisateurs pour qui il est 8h. Les e-mails de notification et le résumé
portent en pied « Gérer mes notifications » et le lien de désinscription.

## Nouveaux types

Ils sont émis depuis l'événement de leur domaine, à toute l'équipe sauf
l'auteur, puis triés par les préférences :

- `reservation.created`, `reservation.confirmed`, `reservation.cancelled`
  (`ReservationChanged`) ;
- `reservation.starts_tomorrow` (scan quotidien, une notification par bateau) ;
- `incident.created` (sévérité `error`) et `incident.resolved` (`IncidentChanged`) ;
- `invoice.paid`, au règlement manuel (`InvoicePaid`).

`reservation.created/confirmed/cancelled/starts_tomorrow` et `incident.created`
sont poussables.

## Données

- Nouvelle table `notification_preferences` (`user_id`, `family`, `in_app`,
  `push`, `email`, unique par utilisateur et famille).
- `users.notification_timezone`, `notification_quiet_hours`,
  `notification_email_digest`.
- `notifications.in_app`, `notifications.email_digest_pending`.

## Copilote

Nouvelle cible de navigation `settings.notifications` et nouvelle entrée de
connaissance `notification-preferences`.
