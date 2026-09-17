/**
 * Contexte résolu par `BoatContextService` pour les routes « sous » un bateau
 * (`/boats/:boatId/…`). Générique sur les modèles : `shared/types` est inclus
 * par le tsconfig du front, qui ne connaît pas les modèles Lucid.
 */
export interface BoatContext<U, B> {
  user: U
  boat: B
}

export interface BoatReservationContext<U, B, R> extends BoatContext<U, B> {
  reservation: R
}
