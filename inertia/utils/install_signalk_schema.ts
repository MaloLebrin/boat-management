import type {
  InstallSignalKMarketingContentProps,
  InstallSignalKStep,
} from '#shared/types/marketing_install_signalk'

/**
 * Schéma `HowTo` de la page « Installer Signal K à bord » (#1022) : deux
 * `HowToSection` (chemin plugin, chemin appli), chaque `HowToStep` ancrée sur
 * la section de la page qui la rend. Fonction pure, testée par Vitest ; le
 * composant la sérialise avec `jsonLd()`.
 */
export function installSignalKHowToSchema(
  content: InstallSignalKMarketingContentProps,
  pageUrl: string,
  inLanguage: string
): Record<string, unknown> {
  const section = (
    name: string,
    anchor: string,
    steps: InstallSignalKStep[]
  ): Record<string, unknown> => ({
    '@type': 'HowToSection',
    name,
    'itemListElement': steps.map((step, index) => ({
      '@type': 'HowToStep',
      'position': index + 1,
      'name': step.title,
      'text': step.description,
      'url': `${pageUrl}#${anchor}`,
    })),
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': content.meta.title,
    'description': content.meta.description,
    'inLanguage': inLanguage,
    'totalTime': 'PT1H',
    'supply': content.kits.items
      .flatMap((kit) => kit.items)
      .map((name) => ({
        '@type': 'HowToSupply',
        name,
      })),
    'step': [
      section(content.pluginHowTo.title, 'plugin', content.pluginHowTo.steps),
      section(content.appHowTo.title, 'app', [...content.appHowTo.steps, ...content.https.steps]),
    ],
  }
}
