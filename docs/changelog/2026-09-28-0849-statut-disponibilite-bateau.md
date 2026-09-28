# 2026-09-28 — Statut de disponibilité du bateau et blocage des réservations en conflit

Issue #870. Un bateau n'avait pas d'état : il était dans la flotte ou supprimé. On pouvait donc confirmer une réservation sur un bateau dont le moteur était démonté, alors que la FAQ promettait que les indisponibilités liées aux entretiens apparaissaient avant d'engager le bateau.

- **Données.** La migration `1865000000000` :
  - ajoute à `boats` `status` (`available` par défaut, `in_maintenance`, `out_of_service`, `sold`, avec CHECK et index), `status_reason` et `status_changed_at` ;
  - crée `boat_status_changes` (de → vers, motif, auteur, date).
- **Changer le statut.**
  - Route `PATCH /boats/:id/status` (`boats.status.update`), avec le droit `boats.edit` et un motif facultatif.
  - Chaque changement écrit une ligne d'historique et une ligne d'audit `boat.status_change`.
  - Il notifie les admins et les propriétaires du bateau, jamais l'auteur : `boat.status_changed`, ou `boat.available_again` à la sortie d'entretien. Les deux notifications sont in-app et push.
- **Indisponibilités calculées.** `BoatAvailabilityService` agrège trois sources :
  - un statut immobilisant ;
  - les tâches ouvertes datées, sur leur durée prévue, une journée par défaut ;
  - les incidents immobilisants ouverts : échouage, voie d'eau, avarie moteur ou gréement, collision, incendie.
- **Réservations.**
  - Une réservation **confirmée** qui chevauche une indisponibilité est refusée, avec un flash qui en donne les motifs. Une **option** reste acceptée.
  - Un admin (nouvelle capability `boats.reservations.force`) peut forcer avec un motif. Le forçage est tracé par l'audit `reservation.force_unavailable`.
  - Un bateau **vendu** n'accepte plus aucune réservation.
  - Modifier une réservation existante sans toucher à ses dates ni à son statut reste possible.
- **Bateau vendu.** Il sort de la liste active (filtre « Statut → Vendu » pour le revoir) et du quota de bateaux. Le remettre en service repasse par le plafond du plan.
- **UI.**
  - Badge de statut dans la liste (colonne « Disponibilité »), sur les cartes et sur la fiche.
  - Lien « Changer le statut » sur la fiche, qui ouvre une modale avec le motif et l'historique.
  - Bandeau d'indisponibilité sur la fiche et sur la page réservations du bateau.
  - Champ « motif de forçage » dans le formulaire de réservation, pour les admins.
  - Filtre par statut sur `/boats`.
- **Assistant.** `get_boat` renvoie la disponibilité (statut, motif, date, fenêtres) et `list_boats` filtre par statut. Nouvelle entrée `boat-availability-status` dans la base de connaissance.
- **Hors périmètre.**
  - Superposition des indisponibilités dans le planning (#869), dans le calendrier flotte `/reservations` et dans le widget d'occupation.
  - Lien public de partage du statut.
