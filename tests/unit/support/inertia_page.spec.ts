import { test } from '@japa/runner'
import { requiredPropsOf } from '#tests/support/inertia_page'

/**
 * Le parseur de `defineProps` de `tests/support/inertia_page.ts` (#689).
 *
 * Il mérite ses propres tests parce que son mode de défaillance est le pire
 * possible : rendre une liste vide. Une fabrique qui n'exige aucune prop passe
 * au vert sur n'importe quelle réponse, et les 60 contrats de page qu'elle
 * porte deviennent décoratifs sans que rien ne l'indique.
 *
 * Les cas ci-dessous sont adossés à de **vraies** pages du dépôt plutôt qu'à
 * des fixtures : si l'une d'elles change de forme, on veut le savoir ici, pas
 * le découvrir par un contrat devenu muet.
 */

test.group('requiredPropsOf (unit)', () => {
  test('reads a plain inline props literal', ({ assert }) => {
    assert.deepEqual(requiredPropsOf('boats/index'), [
      'boats',
      'filters',
      'canAddBoat',
      'boatQuota',
    ])
  })

  test('keeps top-level keys and ignores those of a nested object type', ({ assert }) => {
    // `members: { id: number; fullName: string | null; email: string }[]` —
    // `id`, `fullName` et `email` ne sont pas des props de la page.
    assert.deepEqual(requiredPropsOf('settings/audit_log'), ['auditLog', 'filters', 'members'])
  })

  test('returns nothing for a page that declares no props', ({ assert }) => {
    // Cas légitime : la page de connexion ne reçoit rien du contrôleur
    // (`inertia.render('auth/login', {})`). Son contrat se réduit au composant.
    assert.deepEqual(requiredPropsOf('auth/login'), [])
  })

  test('throws rather than silently requiring nothing on a named props type', ({ assert }) => {
    // Les pages marketing déclarent `defineProps<MarketingHomeProps>()`. Rendre
    // `[]` ici ferait passer leur contrat au vert sans rien vérifier — c'est
    // précisément ce qu'il ne faut pas.
    assert.throws(() => requiredPropsOf('marketing/home'), /type nommé/)
  })
})
