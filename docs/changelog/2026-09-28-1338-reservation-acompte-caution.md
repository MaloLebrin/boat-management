# 2026-09-28 — Réservations : acompte, solde et caution

Issue #875. Une location, c'est un acompte à la réservation, le solde avant le départ et une caution bloquée puis restituée après l'état des lieux de retour. `BoatReservation` ne connaissait que `totalPrice` ; la réservation suit désormais son argent, à la main (le paiement en ligne est l'issue #876).

- **Migration** `1866000000000_add_payment_fields_to_boat_reservations`.
  - Paiement : `deposit_amount`, `deposit_paid_at`, `balance_paid_at`, `paid_amount` (défaut 0), `payment_status` (`unpaid` | `deposit_paid` | `paid` | `refunded`), `payment_method` (`transfer` | `card` | `cash` | `check`).
  - Caution : `security_deposit_amount`, `security_deposit_status` (`none` | `held` | `released` | `retained`), `security_deposit_retained_amount`, `security_deposit_note`.
  - Contraintes CHECK, `down()` complet.
- **À la confirmation.**
  - L'acompte attendu vaut 30 % du prix. Il suit le prix tant qu'il n'est pas reçu.
  - La caution est recopiée du tarif du bateau (`boat_pricing.deposit_amount`).
  - Un prix corrigé après encaissement recalcule le statut de paiement.
- **Routes** (module Location, `boats.manage`).
  - `PATCH /boats/:boatId/reservations/:reservationId/payment` : `kind` = `deposit` (montant modifiable, ≤ prix), `balance` (prix requis) ou `refund` (même sur une réservation annulée), avec le moyen de paiement.
  - `PATCH /boats/:boatId/reservations/:reservationId/security-deposit` : `action` = `hold`, `release` ou `retain` (montant ≤ caution et motif obligatoires).
  - Un refus métier revient en flash sans rien écrire. Autre organisation : redirection `/boats`.
- **Journal d'audit** : `reservation.payment_recorded` (type, montant, moyen, statut) et `reservation.security_deposit_held|released|retained`.
- **Rappels.** Le scan quotidien des notifications crée `reservation.deposit_due` (acompte non reçu sur une réservation confirmée) et `reservation.balance_due` (départ à moins de 7 jours pas soldé), par bateau, vers `/boats/:id/reservations`. Anti-doublon de 7 jours, poussables.
- **Écrans.**
  - Colonne « Paiement » dans la liste par bateau et la liste flotte (acompte attendu, solde à encaisser, acompte reçu, réglée, remboursée).
  - Point rouge sur la pastille du calendrier.
  - Action « Paiement » de chaque ligne : modale avec montants, moyen, « Acompte reçu », « Solde reçu », « Rembourser », puis la caution.
  - Bloc « Caution » sur l'écran d'état des lieux, pour restituer ou retenir au retour.
  - Les actions de ligne passent dans `ReservationRowActions.vue` (limite de 250 lignes).
- **Base de connaissance du copilote** : entrée `reservation-payment`.
- **Tests.**
  - Unitaires : `reservation_payment` (acompte, reste dû, statut, attention) et transformer.
  - Fonctionnels : `reservations/payment.spec.ts` (défauts, encaissements, refus, caution, cross-org, scan). Les deux routes sont ajoutées aux gardes de rôle et de module du domaine.
  - Vitest : badge, panneau Paiement, bloc Caution, liste et calendrier.
- **Hors périmètre** (voir `docs/domain/reservations-and-pricing.md` § 5.5) :
  - factures d'acompte et de solde, et facture de dommages sur caution retenue ;
  - widget « Encaissements à venir » du tableau de bord ;
  - colonnes paiement dans un export CSV des réservations, qui n'existe pas encore (#879) ;
  - pourcentage d'acompte configurable par organisation ou par tarif.
