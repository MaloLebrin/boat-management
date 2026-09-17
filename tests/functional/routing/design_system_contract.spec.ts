import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat du banc d'essai du design system (#689).
 *
 * Seule page du produit rendue directement depuis une route
 * (`router.on('/design-system').renderInertia(…)`) et non depuis un contrôleur.
 * C'est ce qui la faisait échapper au premier jet de la garde : un scan des
 * seuls `inertia.render()` ne l'aurait jamais vue.
 */

test.group('Design system page contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /design-system renders design_system', async ({ client, assert }) => {
    assertPageContract(assert, await client.get('/design-system').withInertia(), 'design_system')
  })
})
