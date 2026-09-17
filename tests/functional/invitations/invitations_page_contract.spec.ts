import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat de la page d'acceptation d'invitation (#689).
 *
 * ⚠️ Ce composant est rendu depuis **cinq** endroits du contrôleur — jeton
 * absent, invitation valide, introuvable, expirée, déjà utilisée — avec la même
 * forme de props et une prop `error` qui seule les distingue. Épingler le
 * composant ne distingue donc pas les cinq états : ce test fige le contrat de
 * props, pas la sémantique de chaque état, et il ne faut pas lire ici une
 * couverture qu'il n'apporte pas.
 */

test.group('Invitations page contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /invitations/accept without a token renders invitations/accept', async ({
    client,
    assert,
  }) => {
    assertPageContract(
      assert,
      await client.get('/invitations/accept').withInertia(),
      'invitations/accept'
    )
  })

  test('GET /invitations/accept with an unknown token renders the same page', async ({
    client,
    assert,
  }) => {
    assertPageContract(
      assert,
      await client.get('/invitations/accept?token=unknown').withInertia(),
      'invitations/accept'
    )
  })
})
