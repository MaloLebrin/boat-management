import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { assertPageContract } from '#tests/support/inertia_page'
import { readFileSync } from 'node:fs'

/**
 * Contrat du banc d'essai du design system (#689).
 *
 * Seule page du produit rendue directement depuis une route
 * (`router.on('/design-system').renderInertia(…)`) et non depuis un contrôleur.
 * C'est ce qui la faisait échapper au premier jet de la garde : un scan des
 * seuls `inertia.render()` ne l'aurait jamais vue.
 *
 * La route n'est enregistrée que hors production (`!app.inProduction`, #862).
 * Cette suite tourne avec `NODE_ENV=test`, donc la page reste joignable ici.
 */

test.group('Design system page contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /design-system renders design_system', async ({ client, assert }) => {
    const source = readFileSync(new URL('../../../start/routes/home.ts', import.meta.url), 'utf8')
    assert.include(source, 'if (!app.inProduction)')

    assertPageContract(assert, await client.get('/design-system').withInertia(), 'design_system')
  })
})
