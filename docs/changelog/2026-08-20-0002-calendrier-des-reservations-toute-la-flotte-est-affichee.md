# 2026-08-20 — Calendrier des réservations : toute la flotte est affichée, pas seulement les bateaux réservés (#477)

Suite de la campagne du 03/08. `/reservations` en vue « Calendrier » ne montrait **qu'une ligne pour cinq bateaux** : les lignes étaient construites à partir des réservations, donc un bateau sans aucune réservation n'existait pas dans la vue. C'est l'inverse de ce que la vue promet — « Vue multi-bateaux de toutes les réservations » sert justement à lire les disponibilités de la flotte d'un coup d'œil.

- **Une ligne par bateau de la flotte.** Le calendrier est désormais amorcé avec les bateaux de l'organisation (triés par nom), puis les réservations viennent s'y ranger. Un bateau sans réservation garde sa ligne, vide : c'est là qu'on lit sa disponibilité.
- **Le filtre bateau reste respecté.** Quand un bateau est sélectionné, le calendrier ne montre que sa ligne — pas toute la flotte.
- **Nouveau transformer `toFleetCalendarEntries`.** Le regroupement vivait en dur dans `ReservationsController.index` ; il passe dans `app/transformers/boat_reservation_transformer.ts`, conformément à la règle « pas de formatage dans les controllers ».
- **Légende « Disponible ».** Une pastille neutre ouvre la légende pour que la case vide se lise comme une disponibilité et non comme une donnée manquante.
- **État vide recalibré.** Il ne se déclenche plus que si l'organisation n'a aucun bateau (`reservations.calendar.noBoatsTitle` / `noBoatsDescription`, EN + FR) — auparavant il masquait toute la flotte dès qu'il n'y avait pas de réservation.
- **Tests.** 5 tests unitaires sur le transformer (ordre, bateaux sans réservation, regroupement, réservation hors flotte, flotte vide), 3 tests fonctionnels sur `/reservations` (flotte complète, scope organisation, filtre `?boatId=`) et 1 test Vitest sur `ReservationTimeline`. Ils échouent sur le code d'avant.
