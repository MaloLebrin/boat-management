import '@adonisjs/inertia/types'

/**
 * Le programme TypeScript du client (`inertia/tsconfig.json`) embarque les
 * contrôleurs : `inertia/client.ts` importe le registre généré
 * (`.adonisjs/client/registry`), qui référence chaque contrôleur pour typer les
 * routes. Mais la carte des pages (`.adonisjs/server/pages.d.ts`) appartient au
 * programme serveur : côté client, `InertiaPages` reste donc vide et chaque
 * `inertia.render('boats/show', …)` d'un contrôleur est rapporté comme
 * « argument non assignable au type never » — un artefact de configuration, pas
 * une vraie erreur.
 *
 * On neutralise ce contrôle ici, dans le seul programme client. Le contrat
 * nom de page / props reste vérifié par `tsc -b` (racine), qui charge
 * `pages.d.ts` : un `inertia.render('page/inexistante')` y échoue toujours.
 */
declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    // `any` assumé : la signature d'index doit accepter n'importe quel objet de
    // props, y compris ceux décrits par une `interface` — qui, faute de
    // signature d'index implicite, ne satisfait pas `Record<string, JSONDataTypes>`.
    [page: string]: Record<string, any>
  }
}
