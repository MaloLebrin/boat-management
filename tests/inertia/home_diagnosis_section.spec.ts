import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import HomeDiagnosisSection from '../../inertia/components/marketing/home/HomeDiagnosisSection.vue'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

const baseProps = {
  eyebrow: 'ESSAI GRATUIT',
  title: 'Ton moteur fait des siennes ?',
  titleHighlight: "Demande à l'IA.",
  subtitle: 'Décris la panne en deux phrases.',
  items: ['Quelques questions ciblées', 'Des causes classées par coût', 'Une prochaine étape'],
  ctaLabel: 'Diagnostiquer ma panne',
  ctaHref: '/fr/diagnostic-panne-ia',
  note: 'Gratuit, sans compte · 2 diagnostics offerts',
  disclaimer: "L'assistant ne remplace pas un professionnel.",
}

test('la section rend la promesse, les étapes et le rappel du quota', () => {
  const w = mount(HomeDiagnosisSection, { props: baseProps })

  expect(w.text()).toContain(baseProps.title)
  expect(w.text()).toContain(baseProps.titleHighlight)
  for (const item of baseProps.items) {
    expect(w.text()).toContain(item)
  }
  expect(w.text()).toContain(baseProps.note)
  expect(w.text()).toContain(baseProps.disclaimer)
})

// #609 — le CTA vise le chat public, pas /signup : c'est l'entrée sans friction
// du tunnel, l'inscription n'est proposée qu'après le diagnostic.
test('le CTA pointe vers le chat public et jamais vers /signup', () => {
  const w = mount(HomeDiagnosisSection, { props: baseProps })

  const cta = w.get('a[href="/fr/diagnostic-panne-ia"]')
  expect(cta.text()).toContain(baseProps.ctaLabel)
  expect(w.findAll('a[href="/signup"]').length).toBe(0)
})
