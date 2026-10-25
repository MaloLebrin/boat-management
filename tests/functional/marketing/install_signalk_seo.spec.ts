import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { marketingPath, SITE_URL } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { signalkPluginInstallCommand } from '#shared/helpers/instruments'
import { SIGNALK_PLUGIN_INSTALL_PATH, SIGNALK_PLUGIN_PACKAGE } from '#shared/constants/instruments'
import {
  INSTALL_SIGNALK_APP_STEP_COUNT,
  INSTALL_SIGNALK_COMPARISON_COUNT,
  INSTALL_SIGNALK_ENGINES_COUNT,
  INSTALL_SIGNALK_FAQ_COUNT,
  INSTALL_SIGNALK_HTTPS_STEP_COUNT,
  INSTALL_SIGNALK_KIT_COUNT,
  INSTALL_SIGNALK_PLUGIN_STEP_COUNT,
  INSTALL_SIGNALK_TROUBLESHOOTING_COUNT,
} from '#shared/types/marketing_install_signalk'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'
import type { InstrumentsMarketingContentProps } from '#shared/types/marketing_instruments'

interface InstallSignalKPageProps {
  locale: 'en' | 'fr'
  content: InstallSignalKMarketingContentProps
}

/** Longueur au-delà de laquelle Google tronque un titre / une description dans les SERP. */
const TITLE_MAX_LENGTH = 60
const DESCRIPTION_MAX_LENGTH = 160

async function fetchProps<T>(client: ApiClient, path: string): Promise<T> {
  const response = await client.get(path).withInertia()
  response.assertStatus(200)
  return response.body().props as T
}

/** Toutes les chaînes d'un objet de props, à plat — pour traquer clés brutes et placeholders. */
function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

const KEYWORD: Record<'fr' | 'en', RegExp> = { fr: /installer/i, en: /install/i }

/**
 * SEO de la page « Installer Signal K à bord » (#1022) — même traitement que
 * la page instruments : contenu éditorial servi par
 * `MarketingInstallSignalKContentService`, meta à mot-clé sans la marque.
 */
test.group('Installer Signal K — contenu SEO (#1022)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] le titre SEO porte le mot-clé et « Signal K », sans la marque, sous ${TITLE_MAX_LENGTH} caractères`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(marketingPath('installSignalK', locale)).withInertia()
      response.assertStatus(200)
      response.assertInertiaComponent('marketing/install_signalk')
      const { content } = response.body().props as InstallSignalKPageProps

      assert.match(content.meta.title, KEYWORD[locale])
      assert.match(content.meta.title, /Signal K/)
      assert.notInclude(content.meta.title, 'FleetAi')
      assert.isAtMost(content.meta.title.length, TITLE_MAX_LENGTH)
      assert.match(content.meta.description, /OpenPlotter/)
      assert.isAtMost(content.meta.description.length, DESCRIPTION_MAX_LENGTH)
    })

    test(`[${locale}] la page sert kits, chemins, deux HowTo, HTTPS, moteurs, dépannage, FAQ`, async ({
      client,
      assert,
    }) => {
      const props = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )
      const { content } = props

      assert.equal(props.locale, locale)
      assert.lengthOf(content.hero.durations, 3)
      assert.lengthOf(content.kits.items, INSTALL_SIGNALK_KIT_COUNT)
      assert.lengthOf(content.paths.rows, INSTALL_SIGNALK_COMPARISON_COUNT)
      assert.lengthOf(content.pluginHowTo.steps, INSTALL_SIGNALK_PLUGIN_STEP_COUNT)
      assert.lengthOf(content.appHowTo.steps, INSTALL_SIGNALK_APP_STEP_COUNT)
      assert.lengthOf(content.https.steps, INSTALL_SIGNALK_HTTPS_STEP_COUNT)
      assert.lengthOf(content.engines.items, INSTALL_SIGNALK_ENGINES_COUNT)
      assert.lengthOf(content.troubleshooting.rows, INSTALL_SIGNALK_TROUBLESHOOTING_COUNT)
      assert.lengthOf(content.faq.items, INSTALL_SIGNALK_FAQ_COUNT)
      assert.equal(content.hero.primaryCta.href, '/signup?from=install-signalk')
      assert.equal(content.hero.secondaryCta.href, marketingPath('instruments', locale))
      assert.equal(content.finalCta.primaryCta.href, '/signup?from=install-signalk')
      assert.equal(content.finalCta.secondaryCta.href, marketingPath('instruments', locale))
      for (const card of content.engines.items) assert.isDefined(card.icon)
    })

    test(`[${locale}] les kits citent le matériel, un budget et des liens officiels en https`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )
      const [nothing, cerbo, existing] = content.kits.items

      assert.match(nothing.title, /Raspberry Pi/)
      assert.match(nothing.items.join(' '), /OpenPlotter/)
      assert.match(nothing.items.join(' '), /PICAN-M/)
      assert.match(nothing.items.join(' '), /NGT-1/)
      assert.match(nothing.items.join(' '), /NMEA 0183/)
      assert.match(cerbo.title, /Cerbo GX/)
      assert.match(cerbo.description, /Venus OS Large/)
      assert.match(existing.title, /Signal K/)
      for (const kit of content.kits.items) {
        assert.isNotEmpty(kit.budget)
        assert.isNotEmpty(kit.duration)
        assert.isAtLeast(kit.links.length, 1)
        for (const link of kit.links) {
          assert.match(link.href, /^https:\/\//)
          assert.isNotEmpty(link.label)
        }
      }
    })

    test(`[${locale}] le chemin plugin rend la commande réelle du script et le paquet npm`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )
      const command = content.pluginHowTo.steps.find((step) => step.code)

      assert.isDefined(command, 'aucune étape du chemin plugin ne porte la commande')
      assert.equal(command!.code, signalkPluginInstallCommand(SITE_URL, null))
      assert.isNotEmpty(command!.codeLabel)
      assert.equal(content.pluginHowTo.packageName, SIGNALK_PLUGIN_PACKAGE)
      const appstore = content.pluginHowTo.steps.map((step) => step.description).join(' ')
      assert.include(appstore, SIGNALK_PLUGIN_PACKAGE)
      assert.include(appstore, 'Appstore')
    })

    test(`[${locale}] le chemin HTTPS détaille DuckDNS, DNS-01, les fichiers de Signal K et Caddy, et réserve l'iPhone`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )
      const text = collectStrings(content.https).join(' ')

      assert.include(text, 'DuckDNS')
      assert.include(text, 'DNS-01')
      assert.include(text, 'ssl-key.pem')
      assert.include(text, 'ssl-cert.pem')
      assert.include(text, '~/.signalk')
      assert.include(text, 'Caddy')
      assert.match(
        content.https.iphoneNote,
        locale === 'fr' ? /pas encore validé/i : /not yet validated/i
      )
      const links = content.https.steps.flatMap((step) => step.links ?? [])
      assert.isAtLeast(links.length, 3)
      for (const link of links) assert.match(link.href, /^https:\/\//)
    })

    test(`[${locale}] le dépannage couvre contenu mixte, certificat, jeton, périmé et historique vide`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )
      const symptoms = content.troubleshooting.rows.map((row) => row.symptom).join(' ')

      assert.include(symptoms, 'http://')
      assert.match(symptoms, locale === 'fr' ? /certificat/i : /certificate/i)
      assert.match(symptoms, locale === 'fr' ? /non autorisé/i : /unauthorized/i)
      assert.match(symptoms, locale === 'fr' ? /périmé/i : /stale/i)
      assert.match(symptoms, locale === 'fr' ? /historique/i : /history/i)
    })

    test(`[${locale}] aucune clé brute, aucun placeholder, aucun autre paquet signalk-*`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )

      for (const value of collectStrings(content)) {
        assert.isNotEmpty(value)
        assert.notInclude(value, 'marketing.installSignalK')
        assert.notInclude(value, 'marketing.features.')
        assert.notInclude(value, '{package}')
        // La commande cite le chemin du script (`signalk-plugin.sh`) : seul cas légitime.
        if (value.includes(SIGNALK_PLUGIN_INSTALL_PATH)) continue
        for (const [name] of value.matchAll(/signalk-[a-z]+/g)) {
          assert.equal(name, SIGNALK_PLUGIN_PACKAGE)
        }
      }
    })

    test(`[${locale}] le maillage interne pointe vers les pages marketing de la locale`, async ({
      client,
      assert,
    }) => {
      const { content } = await fetchProps<InstallSignalKPageProps>(
        client,
        marketingPath('installSignalK', locale)
      )
      const expected: MarketingPage[] = ['instruments', 'help', 'maintenance']

      assert.deepEqual(
        content.crossLinks.items.map((item) => item.href),
        expected.map((page) => marketingPath(page, locale))
      )
    })

    test(`[${locale}] la page instruments et l'aide renvoient vers le guide d'installation`, async ({
      client,
      assert,
    }) => {
      const instruments = await fetchProps<{ content: InstrumentsMarketingContentProps }>(
        client,
        marketingPath('instruments', locale)
      )
      const help = await fetchProps<{
        t: { resources: { items: Array<{ href: string }> } }
      }>(client, marketingPath('help', locale))

      assert.equal(
        instruments.content.install.helpCta.href,
        marketingPath('installSignalK', locale)
      )
      const faq = instruments.content.faq.items.map((item) => item.a).join(' ')
      assert.match(faq, /Signal K/)
      assert.isTrue(
        help.t.resources.items.some(
          (item) => item.href === marketingPath('installSignalK', locale)
        ),
        "la section Ressources de l'aide n'a pas de carte vers le guide d'installation"
      )
    })
  }

  test('le sitemap liste les deux URL du guide avec leurs alternates', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/sitemap.xml')
    response.assertStatus(200)
    const xml = response.text()

    for (const locale of ['en', 'fr'] as const) {
      assert.include(xml, `<loc>${SITE_URL}${marketingPath('installSignalK', locale)}</loc>`)
    }
    assert.include(
      xml,
      `hreflang="x-default" href="${SITE_URL}${marketingPath('installSignalK', 'en')}"`
    )
  })
})
