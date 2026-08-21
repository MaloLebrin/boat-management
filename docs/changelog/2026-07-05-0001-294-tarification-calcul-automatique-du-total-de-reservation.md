# 2026-07-05 — [#294] Tarification : calcul automatique du total de réservation

**Lot 3/3 de l'epic Tarification (#284)** : calcul automatique du total de réservation basé sur le tarif de base du bateau et les périodes saisonnières.

- **Cœur partagé** : `shared/helpers/reservation_quote.ts` exporte la fonction pure `computeReservationQuote(pricing, seasons, startsAt, endsAt)` et `countBilledNights(startsAt, endsAt)` (type `ReservationQuote` : `hasPricing`, `currency`, `nights`, `total`, `deposit`, `minDays`, `maxDays`, `withinBounds`, `boundsError`, `usedWeeklyRate`, `lines[]`). Règles : tarif journalier saisonnier (prix absolu ou `base × multiplicateur`) sinon tarif de base ; tarif hebdomadaire pour les semaines pleines quand aucune saison ne s'applique ; résolution des saisons par priorité puis périmètre bateau > global
- **Backend** :
  - `app/services/pricing_season_service.ts` : nouvelle méthode `listForBoatScope(organizationId, boatId)` retournant les saisons applicables à un bateau (saisons propres + saisons globales de l'org)
  - `app/services/reservation_quote_service.ts` (nouveau) : service injectable `quoteForBoat(boat, startsAt, endsAt)` qui assemble le tarif de base, les saisons et appelle `computeReservationQuote`
  - `app/services/boat_reservation_service.ts` : injection de `BoatPricingService` et `ReservationQuoteService` ; enforcement des bornes min/max jours (lève `ReservationDurationError`) ; auto-remplissage de `totalPrice` dans `create` si non fourni et tarif configuré
  - `app/exceptions/reservation_errors.ts` : nouvelle erreur `ReservationDurationError` avec `reason: 'below_min' | 'above_max'`
  - `app/controllers/boat_reservations_controller.ts` : `index` expose `boatPricing` et `pricingSeasons` au frontend ; `store`/`update` gèrent `ReservationDurationError` avec flash i18n
- **Frontend** : composant `ReservationQuoteCard.vue` (détail par ligne, caution, avertissement hors bornes, bouton « appliquer ») intégré au formulaire de création (auto-remplissage de `total_price` si vide) et à la modale d'édition
- **i18n** : namespace `reservations.quote.*` (en + fr) + `flash.reservation.belowMinDays` / `flash.reservation.aboveMaxDays`
- **Tests** : 13 unitaires sur la fonction pure (mono/multi-saison, semaine vs jour, multiplicateur, priorité de périmètre, bornes) + 7 fonctionnels (auto-remplissage, saison appliquée, rejet hors bornes, exposition des props, non-régression sans tarif) + 3 Vitest (carte d'estimation)
