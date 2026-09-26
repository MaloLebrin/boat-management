import { createApp, createSSRApp } from 'vue'

/**
 * Choisit la fabrique Vue adaptée au conteneur Inertia (#835).
 *
 * Quand le SSR a déjà rempli le conteneur, il faut `createSSRApp` pour que
 * Vue **hydrate** l'arbre existant. Avec `createApp`, Vue ignore le HTML
 * serveur et remonte tout l'arbre côté client : double rendu, perte de
 * l'état DOM du premier paint et avertissements d'hydratation masqués.
 *
 * Un conteneur vide (SSR désactivé, page rendue sans HTML serveur) garde le
 * montage classique.
 */
export function pickVueAppFactory(el: Element): typeof createApp | typeof createSSRApp {
  return el.hasChildNodes() ? createSSRApp : createApp
}
