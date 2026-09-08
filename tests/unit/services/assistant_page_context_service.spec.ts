import { test } from '@japa/runner'
import { normalizePath } from '#services/assistant_page_context_service'

test.group('normalizePath — strip query/hash, URL absolue, slash final', () => {
  test('retire la query string', ({ assert }) => {
    assert.equal(normalizePath('/boats?tab=overview'), '/boats')
  })

  test('retire le hash', ({ assert }) => {
    assert.equal(normalizePath('/planning#tasks'), '/planning')
  })

  test('retire query et hash combines', ({ assert }) => {
    assert.equal(normalizePath('/boats/42?view=grid#top'), '/boats/42')
  })

  test('URL absolue -> pathname uniquement', ({ assert }) => {
    assert.equal(normalizePath('https://app.fleetai.fr/boats/3'), '/boats/3')
  })

  test('URL absolue avec query -> pathname sans query', ({ assert }) => {
    assert.equal(normalizePath('https://app.fleetai.fr/navigation?filter=fuel'), '/navigation')
  })

  test('retire le slash final (chemin > 1 char)', ({ assert }) => {
    assert.equal(normalizePath('/boats/'), '/boats')
    assert.equal(normalizePath('/boats/42/'), '/boats/42')
  })

  test('chemin sans slash initial -> null', ({ assert }) => {
    assert.isNull(normalizePath('boats/42'))
    assert.isNull(normalizePath('navigation'))
  })

  test('chaine vide -> null', ({ assert }) => {
    assert.isNull(normalizePath(''))
    assert.isNull(normalizePath('   '))
  })

  test('racine / est conservee telle quelle', ({ assert }) => {
    assert.equal(normalizePath('/'), '/')
  })

  test('chemin deja propre est retourne tel quel', ({ assert }) => {
    assert.equal(normalizePath('/boats/42'), '/boats/42')
    assert.equal(normalizePath('/planning'), '/planning')
  })
})
