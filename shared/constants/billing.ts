/**
 * Destination unique des redirections d'upsell (#456).
 *
 * Un écran gaté par plan ou par module doit renvoyer l'utilisateur **connecté**
 * vers la page de facturation — jamais vers `/`, qui redirige sur la home
 * marketing publique (`/en`). Le layout public ne rend aucun toast de flash :
 * la redirection y est totalement silencieuse et donne l'impression d'une
 * déconnexion.
 */
export const BILLING_SETTINGS_PATH = '/settings/billing'
