import 'fake-indexeddb/auto'
import { vi } from 'vitest'

/**
 * `Link` (`@adonisjs/inertia/vue`) appelle `useTuyau()`, qui exige un
 * `TuyauProvider` au-dessus du composant monté. Depuis #533 la navigation
 * interne passe partout par `<Link>` : sans ce doublon, chaque test montant un
 * composant qui contient un lien devrait fournir le provider ou remocker le
 * module à la main.
 *
 * Le doublon rend la même ancre que le vrai composant, donc les assertions
 * `a[href]` restent valables. Les autres exports (`Form`, `useRouter`…) gardent
 * leur implémentation réelle, et un test peut toujours poser son propre
 * `vi.mock('@adonisjs/inertia/vue', …)` — il a la priorité.
 */
vi.mock('@adonisjs/inertia/vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@adonisjs/inertia/vue')>()
  return {
    ...actual,
    Link: {
      name: 'TuyauLink',
      props: {
        href: { type: String, required: false },
        route: { type: String, required: false },
      },
      template: '<a :href="href"><slot /></a>',
    },
  }
})
