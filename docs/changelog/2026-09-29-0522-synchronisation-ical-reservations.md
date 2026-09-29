# 2026-09-29 — Synchronisation iCal des réservations (#880)

Les réservations se synchronisent avec les agendas et les plateformes de
location (Click&Boat, Samboat, Airbnb…) au format iCal, dans les deux sens.

## Export : flux publié par jeton

- `GET /calendar/<jeton>.ics` (`calendar.feed`), **sans session**, limité à
  30 lectures/min/IP. Un flux par bateau et un pour la flotte (table
  `calendar_feeds`). Jeton de 32 octets aléatoires ; un jeton inconnu,
  révoqué, ou une organisation sans module Location → 404.
- Gestion : `POST/PATCH/DELETE /boats/:boatId/calendar-feed` et
  `/reservations/calendar-feed` (créer ou régénérer, contenu, révoquer).
- Contenu : réservations `confirmed` (`CONFIRMED`) et `option` (`TENTATIVE`) de
  l'année écoulée et à venir. `UID` stable, `SEQUENCE` =
  `boat_reservations.ical_sequence` (nouvelle colonne, incrémentée quand les
  dates, le statut ou le client changent). Le nom du client n'apparaît
  qu'avec l'option cochée ; les entretiens planifiés sont en option ; les
  créneaux importés ne sont jamais republiés.

## Import : calendriers externes

- `POST /boats/:boatId/external-calendars`, `…/:calendarId/sync`,
  `DELETE …/:calendarId` (tables `external_calendars`,
  `external_calendar_events`). Synchronisation à l'ajout, à la demande, et
  toutes les 30 minutes (job `SyncExternalCalendars`, cron `*/30 * * * *`).
- Idempotent par `UID` (créneau déplacé → mis à jour, disparu → supprimé). Un
  échec garde les créneaux de la dernière synchro réussie et note un code
  d'erreur traduit à l'écran.
- Les créneaux importés **bloquent** une option comme une confirmation
  (flash `flash.reservation.externalConflict`), sans forçage. Ils ne comptent
  pas dans le chiffre d'affaires, l'occupation, la facturation ni les exports.
  Le nombre de doubles réservations déjà présentes est affiché.
- SSRF : `https` seulement, port 443, sans identifiants. Chaque adresse
  résolue est vérifiée au moment de la connexion (IP privées, boucle locale,
  lien local, métadonnées cloud refusées), 3 redirections revérifiées au
  plus, 10 s, 2 Mo.

## Écran, droits, audit

- Encart « Synchroniser avec un calendrier externe » sur l'onglet
  Réservations du bateau ; carte « Flux iCal de la flotte » sur
  `/reservations`. Les créneaux importés s'affichent en violet pointillé.
- Droits : `boats.manage` (admin, membre) ; un mécanicien voit sans agir.
  Gating : module Location.
- Audit : `calendar.token_created`, `calendar.token_revoked`,
  `external_calendar.added`, `external_calendar.removed`.
- Guide utilisateur : `docs/user-guide/ical-synchronisation.md`.
