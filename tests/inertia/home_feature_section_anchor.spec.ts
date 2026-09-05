import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

// La maquette rendue par la section (HomeMockBoatDetail) lit `appT` via useT :
// hors app Inertia, on mocke le composable comme dans marketing_feature.spec.ts.
vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import HomeFeatureSection from '../../inertia/components/marketing/home/HomeFeatureSection.vue'

const baseProps = {
  eyebrow: 'EYEBROW',
  title: 'Title',
  titleHighlight: 'highlight',
  body: 'Body',
  bullets: ['Bullet one', 'Bullet two'],
  mockType: 'boatDetail' as const,
}

// #610 — le header/drawer/footer pointent vers `/{locale}#features` : la
// section doit exposer cet id pour que l'ancre ne renvoie plus en haut de page.
test("applique l'id fourni via anchorId sur la section, avec scroll-mt pour le header sticky", () => {
  const w = mount(HomeFeatureSection, { props: { ...baseProps, anchorId: 'features' } })

  const section = w.get('section')
  expect(section.attributes('id')).toBe('features')
  expect(section.classes()).toContain('scroll-mt-24')
})

test("ne pose pas d'id quand anchorId n'est pas fourni", () => {
  const w = mount(HomeFeatureSection, { props: baseProps })

  expect(w.get('section').attributes('id')).toBeUndefined()
})
