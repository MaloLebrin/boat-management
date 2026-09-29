# 2026-09-29 — Page publique de réservation en ligne (#881)

Un loueur ouvre, bateau par bateau, une page publique où ses clients voient
les disponibilités, obtiennent un devis et envoient une demande de
réservation, sans compte et sans commission.

## Routes

- `GET /book/:orgSlug` (`book.fleet`) : page flotte, les bateaux ouverts.
- `GET /book/:orgSlug/:boatSlug` (`book.show`) : fiche, calendrier, devis.
  Les dates arrivent en query string (`?startsOn=…&endsOn=…`) et reviennent
  en prop `quote`, calculée côté serveur (visite partielle `only: ['quote']`).
- `POST /book/:orgSlug/:boatSlug/request` (`book.request`) : la demande.
- `PATCH /boats/:boatId/public-booking` (`boats.publicBooking.update`) :
  ouverture / fermeture, `BoatPolicy.manage`, module Location.
- Sans session. 404 pour une organisation inconnue ou sans module Location,
  ou pour un bateau fermé ou vendu. `noindex`. Throttles : 60 lectures/min/IP,
  5 demandes/10 min/IP (flash, pas de 429 brute).

## Données

- Migration `1872000000000_add_public_booking` :
  - `boats.public_booking_enabled` et `boats.public_booking_slug`, dérivé du
    nom à la première ouverture puis figé, unique dans l'organisation ;
  - `boat_reservations.source` (`internal` | `public`) et
    `boat_reservations.request_locale`.
- Une demande crée une réservation `option`, `source: 'public'`. Le message
  va dans les notes, le devis dans `total_price`. Les dates vont de minuit à
  minuit à l'heure de Paris, et le jour du départ reste libre.
- Les jours occupés (réservations, créneaux importés, indisponibilités) sont
  publiés sans aucune donnée personnelle. Ils sont revérifiés dans la
  transaction de la demande, y compris les entretiens planifiés.

## Comportements

- Champ piège (`website`) : une demande de robot reçoit la même réponse qu'un
  succès, et rien n'est écrit ni envoyé. Le consentement est obligatoire.
- Notification `reservation.requested` (in-app + push) et e-mail aux admins.
  Le client reçoit un accusé de réception aux couleurs du loueur (marque
  blanche Entreprise).
- Confirmer ou annuler une option publique envoie un e-mail au client dans la
  langue de sa demande. C'est aussi le cas quand une confirmation sur le même
  créneau l'annule d'office. Une réservation interne n'envoie rien.
- Badge « Demande en ligne » dans les listes de réservations.
- Purge quotidienne (`PurgePublicFormData`) : les demandes jamais abouties de
  plus de 30 jours (option ou annulée, sans paiement, contrat, facture ni état
  des lieux) sont supprimées. La politique de confidentialité l'annonce.

## Documentation

- `docs/domain/reservations-and-pricing.md` §5.2 quater.
- Guide utilisateur : `docs/user-guide/reservation-en-ligne.md`.
- Base de connaissance du copilote : entrée `public-booking-page`.
