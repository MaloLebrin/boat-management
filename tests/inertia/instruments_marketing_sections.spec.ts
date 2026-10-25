import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))

import InstrumentsCardsSection from '../../inertia/components/marketing/instruments/InstrumentsCardsSection.vue'
import InstrumentsAlertsSection from '../../inertia/components/marketing/instruments/InstrumentsAlertsSection.vue'
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

  test('affiche le pictogramme de la carte quand il est fourni', () => {
    const wrapper = mount(InstrumentsCardsSection, {
      props: {
        eyebrow: 'e',
        title: 't',
        titleHighlight: 'h',
        subtitle: 's',
        items: [
          { title: 'Moteur', description: 'd', icon: 'engine' },
          { title: 'Sans icône', description: 'd' },
        ],
      },
    })

    const icons = wrapper.findAll('[data-testid="instruments-card-icon"]')
    expect(icons).toHaveLength(1)
    expect(icons[0].find('svg').exists()).toBe(true)
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

describe('InstrumentsAlertsSection (#995)', () => {
  const alerts: InstrumentsMarketingContentProps['alerts'] = {
    eyebrow: 'Alertes',
    title: 'Prévenu avant que',
    titleHighlight: 'ça tourne mal.',
    subtitle: 'Quatre règles actives.',
    items: [
      {
        title: 'Batterie faible',
        description: 'Sous 20 %',
        icon: 'power',
        severity: 'warning',
        severityLabel: 'Avertissement',
      },
      {
        title: 'Petits fonds',
        description: 'Sous 1,5 m',
        icon: 'depth',
        severity: 'critical',
        severityLabel: 'Critique',
      },
    ],
    customTitle: 'Et tes propres règles',
    customDescription: 'Jusqu’à 20 règles',
    team: 'L’équipe est prévenue.',
  }

  test('rend une carte par règle avec sa gravité', () => {
    const wrapper = mount(InstrumentsAlertsSection, { props: { content: alerts } })

    const renderedCards = wrapper.findAll('[data-testid="instruments-alert-card"]')
    expect(renderedCards).toHaveLength(2)
    expect(renderedCards[0].find('[data-severity]').attributes('data-severity')).toBe('warning')
    expect(renderedCards[1].find('[data-severity]').attributes('data-severity')).toBe('critical')
    expect(renderedCards[1].text()).toContain('Critique')
    expect(renderedCards[1].text()).toContain('Sous 1,5 m')
  })

  test('affiche les règles propres au bateau et la notification de l’équipe', () => {
    const wrapper = mount(InstrumentsAlertsSection, { props: { content: alerts } })

    expect(wrapper.text()).toContain('Et tes propres règles')
    expect(wrapper.text()).toContain('Jusqu’à 20 règles')
    expect(wrapper.text()).toContain('L’équipe est prévenue.')
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
