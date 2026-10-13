import { test } from '@japa/runner'
import AssistantProductHelpService from '#services/assistant_product_help_service'
import type { ProductHelpEntry } from '#shared/constants/assistant/product_knowledge'
import { PRODUCT_HELP_MAX_RESULTS, searchProductHelp } from '#shared/helpers/product_help_search'

/**
 * Recherche d'aide produit partagée (#971) : le panneau hors-ligne et l'outil
 * `search_product_help` du copilote appellent la même fonction. Ce fichier
 * fixe la parité — en mer, l'aide locale répond ce que le copilote aurait
 * trouvé à quai.
 */

const QUERIES = [
  'comment déclarer un incident avec photo',
  'mode hors ligne synchronisation',
  'exporter mes factures',
  'heures moteur entretien',
  'Préparer la traversée',
  'xyzzy plugh',
  '',
]

function entry(
  id: string,
  keywords: string[],
  title: string,
  body = 'corps neutre'
): ProductHelpEntry {
  return {
    id,
    title: { fr: title, en: title },
    body: { fr: body, en: body },
    keywords,
    navTarget: null,
  }
}

test.group('Recherche d’aide produit partagée (#971)', () => {
  test('même résultat que le service du copilote, dans les deux locales', ({ assert }) => {
    const service = new AssistantProductHelpService()
    for (const locale of ['fr', 'en'] as const) {
      for (const query of QUERIES) {
        assert.deepEqual(
          searchProductHelp(query, locale),
          service.search(query, locale),
          `« ${query} » (${locale})`
        )
      }
    }
  })

  test('une question du terrain trouve sa fiche, avec son lien', ({ assert }) => {
    const [best] = searchProductHelp('comment déclarer un incident avec photo', 'fr')
    assert.exists(best)
    assert.match(best.title, /incident/i)
  })

  test('mots-clés avant titre avant corps, puis ordre du fichier à égalité', ({ assert }) => {
    const knowledge = [
      entry('corps', ['autre', 'chose', 'ici'], 'Sans rapport', 'parle de mouillage'),
      entry('titre', ['autre', 'chose', 'ici'], 'Mouillage'),
      entry('mot-cle', ['mouillage', 'chose', 'ici'], 'Sans rapport'),
      entry('egal', ['mouillage', 'chose', 'ici'], 'Sans rapport'),
    ]

    const ids = searchProductHelp('mouillage', 'fr', knowledge).map((hit) => hit.id)

    assert.deepEqual(ids, ['mot-cle', 'egal', 'titre'])
    assert.lengthOf(ids, PRODUCT_HELP_MAX_RESULTS)
  })

  test('accents et casse sont ignorés ; les mots de moins de trois lettres aussi', ({ assert }) => {
    const knowledge = [entry('peche', ['peche', 'canne', 'leurre'], 'Pêche')]

    assert.deepEqual(
      searchProductHelp('PÊCHE', 'fr', knowledge).map((hit) => hit.id),
      ['peche']
    )
    assert.deepEqual(searchProductHelp('à la de', 'fr', knowledge), [])
  })
})
