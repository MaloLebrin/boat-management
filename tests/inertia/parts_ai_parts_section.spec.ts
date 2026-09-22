import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import PartsAiPartsSection from '../../inertia/components/marketing/parts_ai/PartsAiPartsSection.vue'

const props = {
  eyebrow: 'Pièces fréquentes',
  title: "Les pièces moteur que l'assistant sait",
  titleHighlight: 'retrouver',
  subtitle: 'Clique sur une pièce pour lancer ta recherche.',
  items: [
    { title: 'Turbine et kit de pompe à eau', description: "La pièce d'usure n°1 du hors-bord." },
    { title: 'Anodes', description: 'La bonne forme et le bon alliage.' },
    { title: 'Kit carburateur et pointeau', description: 'Kit de réfection, joint de cuve.' },
  ],
}

/**
 * Contenu indexable de la page publique de recherche de pièces : chaque pièce
 * est un `h3` (mots-clés longue traîne) et ramène au chat de la même page.
 */
test('rend un h3 par pièce avec sa description', () => {
  const w = mount(PartsAiPartsSection, { props })

  expect(w.findAll('h3').map((h) => h.text())).toEqual(props.items.map((item) => item.title))
  for (const item of props.items) {
    expect(w.text()).toContain(item.description)
  }
  expect(w.get('h2').text()).toContain(props.titleHighlight)
})

test('chaque carte est une ancre vers le chat de la page', () => {
  const w = mount(PartsAiPartsSection, { props })

  const links = w.findAll('a')
  expect(links).toHaveLength(props.items.length)
  for (const link of links) {
    expect(link.attributes('href')).toBe('#parts-chat')
  }
})
