import { expect, test } from 'vitest'
import { jsonLd } from '../../inertia/utils/json_ld'

/**
 * Le JSON-LD est posé dans `<Head>` en balise `script` native (un composant y
 * est ignoré par Inertia) : la chaîne doit rester un JSON valide et ne jamais
 * pouvoir fermer la balise.
 */
test('sérialise un schéma parseable', () => {
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', 'name': 'Diagnostic' }
  expect(JSON.parse(jsonLd(schema))).toEqual(schema)
})

test("échappe `<` pour qu'une valeur ne ferme jamais la balise script", () => {
  const out = jsonLd({ text: 'a </script><b>' })
  expect(out).not.toContain('</script>')
  expect(out).not.toContain('<')
  expect(JSON.parse(out)).toEqual({ text: 'a </script><b>' })
})
