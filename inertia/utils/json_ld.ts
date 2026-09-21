/**
 * Sérialise un schéma schema.org pour une balise `<script type="application/ld+json">`
 * posée **directement** dans `<Head>` d'Inertia.
 *
 * Pourquoi pas un composant : `<Head>` ne rend que des VNodes natifs et jette
 * tout composant (« Using components in the <Head> component is not
 * supported ») — l'ancien `~/components/json_ld` n'a donc jamais rendu un seul
 * bloc, ni en SSR ni côté client. Le template Vue refusant `<script>`, on écrit :
 *
 *   <component :is="'script'" type="application/ld+json">{{ jsonLd(schema) }}</component>
 *
 * `<` est échappé en `\u003c` pour qu'aucune valeur ne puisse fermer la balise.
 */
export function jsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}
