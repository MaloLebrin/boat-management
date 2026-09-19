import { test } from '@japa/runner'
import { readSharedPropKeys } from '#tests/support/inertia_shared_props'

/**
 * Garde de revue des props partagées Inertia (#710).
 *
 * `InertiaMiddleware.share` injecte ses props dans **toutes** les pages, les
 * pages marketing publiques comprises — celles que voit un visiteur non
 * authentifié. Chaque ajout y est donc une décision : la prop doit-elle
 * vraiment partir sur `/`, `/pricing` ou `/cout-entretien-bateau` ? Une prop
 * lourde y coûte du poids sur chaque réponse, une prop sensible y fuite.
 *
 * Rien ne posait cette question. `props_snapshot.spec.ts` tenait une copie en
 * dur des clés partagées pour les écarter de ses comparaisons : ajouter une
 * prop dans le middleware faisait tomber ses **vingt** fixtures d'un coup, avec
 * un diff montrant vingt fichiers porteurs d'une clé en trop. Devant ce mur
 * rouge, le réflexe est de régénérer les fixtures — et la question disparaît.
 *
 * Depuis #710 le snapshot dérive ses clés du middleware : il reste vert. C'est
 * ce test-ci, et lui seul, qui passe au rouge, en **nommant** la prop ajoutée.
 *
 * ⚠️ La liste ci-dessous n'est pas un doublon de la source : c'est la liste
 * **revue**. Le jour où elle diverge du middleware, le bon geste n'est pas de
 * la recopier machinalement mais de décider si la prop a sa place sur une page
 * publique — puis de l'inscrire ici, avec le numéro d'issue en message de
 * commit.
 */

/**
 * Props partagées revues, dans l'ordre du middleware. Toute entrée part sur
 * chaque page rendue par Inertia, authentifiée ou non.
 */
const REVIEWED_SHARED_KEYS = [
  'errors',
  'locale',
  'theme',
  'appT',
  'path',
  'flash',
  'demoSessionStartedAt',
  'demoSessionDurationMs',
  'user',
  'currentPlan',
  'organizationType',
  'activeModules',
  'activeAddons',
  'branding',
  'notifications',
  'vapidPublicKey',
  'permissions',
  'assistantConversation',
]

test.group("Hygiène — props partagées d'InertiaMiddleware (#710)", () => {
  test('toute prop partagée est passée en revue', ({ assert }) => {
    const declared = readSharedPropKeys()

    const added = declared.filter((key) => !REVIEWED_SHARED_KEYS.includes(key))
    const removed = REVIEWED_SHARED_KEYS.filter((key) => !declared.includes(key))

    assert.deepEqual(
      added,
      [],
      `prop(s) partagée(s) ajoutée(s) dans InertiaMiddleware.share sans revue : ${added.join(', ')}. ` +
        "Elles partent désormais sur toutes les pages, y compris les pages marketing publiques. Si c'est voulu, " +
        'les inscrire dans REVIEWED_SHARED_KEYS (tests/unit/hygiene/inertia_shared_props.spec.ts) ; sinon, ' +
        'les sortir de `share` et les passer depuis le contrôleur concerné.'
    )

    assert.deepEqual(
      removed,
      [],
      `prop(s) partagée(s) disparue(s) de InertiaMiddleware.share : ${removed.join(', ')}. ` +
        "Retrait volontaire ? Les retirer de REVIEWED_SHARED_KEYS. Sinon, c'est une régression : " +
        'le front qui les lisait reçoit désormais `undefined`.'
    )

    // L'ordre compte : la liste revue se relit en regard du middleware, et une
    // permutation silencieuse rendrait cette relecture pénible.
    assert.deepEqual(declared, REVIEWED_SHARED_KEYS)
  })

  test("l'extraction n'est pas vide — une garde muette ne garde rien", ({ assert }) => {
    // Sans ce contrôle, un refactor du middleware qui mettrait l'extraction en
    // échec la rendrait vide : le snapshot marketing recommencerait à comparer
    // des props partagées, et ce test-ci passerait au vert en ne comparant
    // rien. `readSharedPropKeys` jette sous son seuil ; on vérifie ici qu'il
    // rend bien la forme attendue.
    const declared = readSharedPropKeys()

    assert.isAtLeast(declared.length, 10)
    assert.equal(new Set(declared).size, declared.length, 'clé partagée dupliquée dans `share`')
    for (const key of declared) assert.match(key, /^[A-Za-z_$][\w$]*$/)
  })
})
