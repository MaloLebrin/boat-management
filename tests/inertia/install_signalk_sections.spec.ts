import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a :href="href"><slot /></a>', props: ['href'] },
}))
vi.mock('../../inertia/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import InstallKitsSection from '../../inertia/components/marketing/install_signalk/InstallKitsSection.vue'
import InstallPathsSection from '../../inertia/components/marketing/install_signalk/InstallPathsSection.vue'
import InstallHowToSection from '../../inertia/components/marketing/install_signalk/InstallHowToSection.vue'
import InstallHttpsSection from '../../inertia/components/marketing/install_signalk/InstallHttpsSection.vue'
import InstallTroubleshootingSection from '../../inertia/components/marketing/install_signalk/InstallTroubleshootingSection.vue'
import InstallDurationsStrip from '../../inertia/components/marketing/install_signalk/InstallDurationsStrip.vue'
import { installSignalKHowToSchema } from '../../inertia/utils/install_signalk_schema'
import { jsonLd } from '../../inertia/utils/json_ld'
import type {
  InstallSignalKMarketingContentProps,
  InstallSignalKStep,
} from '../../shared/types/marketing_install_signalk'

const header = {
  eyebrow: 'Étape',
  title: 'Titre,',
  titleHighlight: 'mis en avant.',
  subtitle: 'Sous-titre.',
}

const steps: InstallSignalKStep[] = [
  { title: 'Génère ton jeton', description: 'Dans l’onglet Instruments.' },
  {
    title: 'Colle la commande',
    description: 'Sur le serveur.',
    code: 'curl -fsSL https://fleetai.app/install/signalk-plugin.sh | FLEETAI_TOKEN=fai_ing_… bash',
    codeLabel: 'Commande',
    codeCaption: 'Relançable sans risque.',
    links: [{ label: 'Signal K', href: 'https://signalk.org/' }],
  },
]

const kits: InstallSignalKMarketingContentProps['kits'] = {
  ...header,
  budgetLabel: 'Budget',
  durationLabel: 'Temps',
  linksLabel: 'Liens',
  items: [
    {
      title: 'Raspberry Pi + OpenPlotter',
      description: 'Le kit de référence.',
      budget: '150 à 350 €',
      duration: '2 h',
      items: ['Raspberry Pi 4', 'PICAN-M'],
      links: [
        { label: 'Raspberry Pi', href: 'https://www.raspberrypi.com/products/' },
        { label: 'OpenPlotter', href: 'https://openplotter.readthedocs.io/' },
      ],
    },
    {
      title: 'Cerbo GX',
      description: 'Venus OS Large.',
      budget: '0 €',
      duration: '30 min',
      items: ['Activer Signal K'],
      links: [],
    },
  ],
}

const paths: InstallSignalKMarketingContentProps['paths'] = {
  ...header,
  pluginTitle: 'Plugin',
  pluginBadge: 'Recommandé',
  pluginDescription: 'Une commande.',
  appTitle: 'Appli',
  appDescription: 'Rien à installer.',
  criterionHeader: 'Critère',
  rows: [
    { criterion: 'iPhone', plugin: 'Oui', app: 'Avec certificat' },
    { criterion: 'Écran ouvert', plugin: 'Non', app: 'Oui' },
  ],
}

const https: InstallSignalKMarketingContentProps['https'] = {
  ...header,
  steps,
  fallbackTitle: 'Auto-signé',
  fallbackDescription: 'Accepte l’avertissement.',
  iphoneTitle: 'iPhone et iPad',
  iphoneNote: 'Pas encore validé.',
}

describe('InstallKitsSection (#1022)', () => {
  test('rend une carte par kit avec budget, matériel et liens externes en nouvel onglet', () => {
    const wrapper = mount(InstallKitsSection, { props: { content: kits } })

    const cards = wrapper.findAll('[data-testid="install-kit"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('150 à 350 €')
    expect(cards[0].findAll('[data-testid="install-kit-item"]')).toHaveLength(2)
    const links = cards[0].findAll('[data-testid="install-external-link"]')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('href')).toBe('https://www.raspberrypi.com/products/')
    expect(links[0].attributes('target')).toBe('_blank')
    expect(links[0].attributes('rel')).toContain('noopener')
    expect(cards[1].find('[data-testid="install-links"]').exists()).toBe(false)
  })
})

describe('InstallPathsSection (#1022)', () => {
  test('rend les deux cartes ancrées et une ligne de comparatif par critère', () => {
    const wrapper = mount(InstallPathsSection, { props: { content: paths } })

    expect(wrapper.find('[data-testid="install-path-plugin"]').attributes('href')).toBe('#plugin')
    expect(wrapper.find('[data-testid="install-path-app"]').attributes('href')).toBe('#app')
    expect(wrapper.text()).toContain('Recommandé')
    const rows = wrapper.findAll('[data-testid="install-paths-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('iPhone')
    expect(rows[0].text()).toContain('Avec certificat')
  })
})

describe('InstallHowToSection (#1022)', () => {
  test('rend l’ancre, le temps total, les étapes, le bloc de code et ses liens', () => {
    const wrapper = mount(InstallHowToSection, {
      props: { id: 'plugin', content: { ...header, totalTime: '15 minutes', steps } },
    })

    expect(wrapper.find('section').attributes('id')).toBe('plugin')
    expect(wrapper.find('[data-testid="install-howto-time"]').text()).toContain('15 minutes')
    const rendered = wrapper.findAll('[data-testid="install-step"]')
    expect(rendered).toHaveLength(2)
    expect(rendered[0].find('[data-testid="base-code-block"]').exists()).toBe(false)
    const block = rendered[1].find('[data-testid="base-code-block"]')
    expect(block.exists()).toBe(true)
    expect(block.find('code').text()).toContain('FLEETAI_TOKEN=')
    expect(block.text()).toContain('Relançable sans risque.')
    expect(rendered[1].find('[data-testid="install-external-link"]').attributes('href')).toBe(
      'https://signalk.org/'
    )
  })
})

describe('InstallHttpsSection (#1022)', () => {
  test('rend les étapes, le repli auto-signé et la réserve iPhone', () => {
    const wrapper = mount(InstallHttpsSection, { props: { content: https } })

    expect(wrapper.findAll('[data-testid="install-step"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="install-https-fallback"]').text()).toContain('Auto-signé')
    const iphone = wrapper.find('[data-testid="install-https-iphone"]')
    expect(iphone.text()).toContain('iPhone et iPad')
    expect(iphone.text()).toContain('Pas encore validé.')
  })
})

describe('InstallTroubleshootingSection et InstallDurationsStrip (#1022)', () => {
  test('rend une ligne par symptôme et une tuile par chemin', () => {
    const trouble = mount(InstallTroubleshootingSection, {
      props: {
        content: {
          ...header,
          symptomHeader: 'Symptôme',
          causeHeader: 'Cause',
          rows: [
            { symptom: 'Contenu mixte', cause: 'Adresse http://' },
            { symptom: 'Non autorisé', cause: 'Jeton absent' },
          ],
        },
      },
    })
    expect(trouble.findAll('[data-testid="install-trouble-row"]')).toHaveLength(2)
    expect(trouble.text()).toContain('Adresse http://')

    const strip = mount(InstallDurationsStrip, {
      props: { items: [{ label: 'Plugin', value: '15 min' }] },
    })
    expect(strip.findAll('[data-testid="install-duration"]')).toHaveLength(1)
    expect(strip.text()).toContain('15 min')
  })
})

describe('installSignalKHowToSchema (#1022)', () => {
  const content = {
    meta: { title: 'Installer Signal K à bord', description: 'Guide.' },
    kits,
    pluginHowTo: { ...header, title: 'Plugin', totalTime: '15 min', packageName: 'x', steps },
    appHowTo: { ...header, title: 'Appli', totalTime: '30 min', steps: [steps[0]] },
    https,
  } as unknown as InstallSignalKMarketingContentProps

  test('produit un HowTo à deux sections, chaque étape ancrée sur son chemin', () => {
    const schema = installSignalKHowToSchema(content, 'https://fleetai.app/fr/guide', 'fr-FR')

    expect(schema['@type']).toBe('HowTo')
    expect(schema.inLanguage).toBe('fr-FR')
    const sections = schema.step as Array<{
      name: string
      itemListElement: Array<{ url: string; position: number }>
    }>
    expect(sections.map((section) => section.name)).toEqual(['Plugin', 'Appli'])
    expect(sections[0].itemListElement).toHaveLength(2)
    expect(sections[0].itemListElement[1]).toMatchObject({
      position: 2,
      url: 'https://fleetai.app/fr/guide#plugin',
    })
    // Le chemin appli inclut les étapes HTTPS : une seule section pour tout le parcours.
    expect(sections[1].itemListElement).toHaveLength(3)
    expect(sections[1].itemListElement[2].url).toBe('https://fleetai.app/fr/guide#app')
    expect(schema.supply).toHaveLength(3)
  })

  test('se sérialise en JSON-LD valide', () => {
    const out = jsonLd(installSignalKHowToSchema(content, 'https://fleetai.app/fr/guide', 'fr-FR'))
    expect(JSON.parse(out)['@context']).toBe('https://schema.org')
  })
})
