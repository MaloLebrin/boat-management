import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import InstrumentsCardsSection from '../../inertia/components/marketing/instruments/InstrumentsCardsSection.vue'
import InstrumentsCompatibilitySection from '../../inertia/components/marketing/instruments/InstrumentsCompatibilitySection.vue'
import type { InstrumentsMarketingContentProps } from '../../shared/types/marketing_instruments'

const cards = [
  { title: 'Moteur', description: 'Régime et heures' },
  { title: 'Énergie', description: 'Tension des batteries' },
]

const compatibility: InstrumentsMarketingContentProps['compatibility'] = {
  eyebrow: 'Compatibilité',
  title: 'Ce qui fonctionne,',
  titleHighlight: 'et ce qui ne fonctionne pas.',
  subtitle: 'FleetAi parle Signal K.',
  supportedTitle: 'Compatible',
  supported: ['OpenPlotter', 'NMEA 2000 via Signal K'],
  unsupportedTitle: 'Pas pris en charge',
  unsupported: ['Passerelle Wi-Fi NMEA brute'],
  planNote: 'Inclus dans les plans Pro et Entreprise.',
}

describe('InstrumentsCardsSection (#995)', () => {
  test('rend l’en-tête et une carte par entrée', () => {
    const wrapper = mount(InstrumentsCardsSection, {
      props: {
        eyebrow: 'Ce que tu vois',
        title: 'Six familles,',
        titleHighlight: 'en langage de bord.',
        subtitle: 'Unités du bord',
        items: cards,
      },
    })

    expect(wrapper.text()).toContain('Ce que tu vois')
    expect(wrapper.text()).toContain('Six familles,')
    expect(wrapper.text()).toContain('en langage de bord.')
    const rendered = wrapper.findAll('[data-testid="instruments-card"]')
    expect(rendered).toHaveLength(2)
    expect(rendered[0].text()).toContain('Moteur')
    expect(rendered[0].text()).toContain('Régime et heures')
  })

  test('trois colonnes par défaut, deux à la demande', () => {
    const base = {
      eyebrow: 'e',
      title: 't',
      titleHighlight: 'h',
      subtitle: 's',
      items: cards,
    }
    const three = mount(InstrumentsCardsSection, { props: base })
    const two = mount(InstrumentsCardsSection, { props: { ...base, columns: 2 } })

    expect(three.find('ul').classes()).toContain('lg:grid-cols-3')
    expect(two.find('ul').classes()).not.toContain('lg:grid-cols-3')
  })

  test('affiche le contenu du slot sous la grille', () => {
    const wrapper = mount(InstrumentsCardsSection, {
      props: { eyebrow: 'e', title: 't', titleHighlight: 'h', subtitle: 's', items: cards },
      slots: { default: '<a href="/fr/aide">Aide</a>' },
    })

    expect(wrapper.find('a[href="/fr/aide"]').exists()).toBe(true)
  })

  test('porte l’identifiant de test demandé', () => {
    const wrapper = mount(InstrumentsCardsSection, {
      props: {
        eyebrow: 'e',
        title: 't',
        titleHighlight: 'h',
        subtitle: 's',
        items: cards,
        testId: 'instruments-install',
      },
    })

    expect(wrapper.find('[data-testid="instruments-install"]').exists()).toBe(true)
  })
})

describe('InstrumentsCompatibilitySection (#995)', () => {
  test('sépare ce qui est pris en charge de ce qui ne l’est pas', () => {
    const wrapper = mount(InstrumentsCompatibilitySection, { props: { content: compatibility } })

    const supported = wrapper.findAll('[data-testid="instruments-supported"]')
    const unsupported = wrapper.findAll('[data-testid="instruments-unsupported"]')
    expect(supported.map((item) => item.text())).toEqual([
      expect.stringContaining('OpenPlotter'),
      expect.stringContaining('NMEA 2000 via Signal K'),
    ])
    expect(unsupported).toHaveLength(1)
    expect(unsupported[0].text()).toContain('Passerelle Wi-Fi NMEA brute')
  })

  test('mentionne le plan requis', () => {
    const wrapper = mount(InstrumentsCompatibilitySection, { props: { content: compatibility } })

    expect(wrapper.text()).toContain('Inclus dans les plans Pro et Entreprise.')
    expect(wrapper.text()).toContain('Compatible')
    expect(wrapper.text()).toContain('Pas pris en charge')
  })
})
