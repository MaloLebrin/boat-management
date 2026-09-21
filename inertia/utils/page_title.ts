/**
 * Template du `<title>` Inertia, partagé par le client (`inertia/app.ts`) et le
 * SSR (`inertia/ssr.ts`). Avant, seul le client l'appliquait : Google lisait un
 * titre sans marque quand l'utilisateur en voyait un autre après hydratation.
 * Les pages passent donc un titre **sans** la marque, le suffixe l'ajoute.
 */
export const APP_TITLE = 'FleetAi'

export function pageTitle(title: string | undefined | null): string {
  return title ? `${title} - ${APP_TITLE}` : APP_TITLE
}
