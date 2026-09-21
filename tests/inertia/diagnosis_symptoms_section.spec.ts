import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import DiagnosisSymptomsSection from '../../inertia/components/marketing/diagnosis/DiagnosisSymptomsSection.vue'

const props = {
  eyebrow: 'Pannes fréquentes',
  title: "Les pannes moteur que l'assistant sait",
  titleHighlight: 'orienter',
  subtitle: 'Clique sur un symptôme pour décrire ta panne.',
  items: [
    { title: 'Le moteur ne démarre pas', description: 'Carburant, allumage ou compression.' },
    { title: 'Il surchauffe', description: 'Le circuit de refroidissement à eau de mer.' },
    { title: 'Il fume', description: 'La couleur de la fumée oriente.' },
  ],
}

/**
 * Contenu indexable de la page publique de diagnostic : chaque symptôme est un
 * `h3` (mots-clés longue traîne) et ramène au chat de la même page — jamais
 * une navigation ailleurs.
 */
test('rend un h3 par symptôme avec sa description', () => {
  const w = mount(DiagnosisSymptomsSection, { props })

  const headings = w.findAll('h3').map((h) => h.text())
  expect(headings).toEqual(props.items.map((item) => item.title))
  for (const item of props.items) {
    expect(w.text()).toContain(item.description)
  }
  expect(w.get('h2').text()).toContain(props.titleHighlight)
})

test('chaque carte est une ancre vers le chat de la page', () => {
  const w = mount(DiagnosisSymptomsSection, { props })

  const links = w.findAll('a')
  expect(links).toHaveLength(props.items.length)
  for (const link of links) {
    expect(link.attributes('href')).toBe('#diagnosis-chat')
  }
})
