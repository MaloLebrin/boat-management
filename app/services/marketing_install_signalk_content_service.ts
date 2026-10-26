import { marketingPath, SITE_URL, toAppLocale } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { signalkPluginInstallCommand } from '#shared/helpers/instruments'
import { SIGNALK_PLUGIN_PACKAGE } from '#shared/constants/instruments'
import type { MarketingI18n } from '#shared/types/marketing'
import type { InstrumentsMarketingIcon } from '#shared/types/marketing_instruments'
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
import type {
  InstallSignalKExternalLink,
  InstallSignalKMarketingContentProps,
  InstallSignalKStep,
} from '#shared/types/marketing_install_signalk'

/** Cartes de maillage interne : clé de copie `features.shared.cards.*` + page cible. */
const CROSS_LINKS: ReadonlyArray<{ card: string; page: MarketingPage }> = [
  { card: 'instruments', page: 'instruments' },
  { card: 'help', page: 'help' },
  { card: 'maintenance', page: 'maintenance' },
]

const HERO_DURATION_COUNT = 3

/** Lien officiel : clé de libellé (`*_link_<key>`) + URL. Les URL ne sont jamais traduites. */
interface OfficialLink {
  key: string
  href: string
}

/**
 * Les trois kits de départ, dans l'ordre des cartes : nombre de lignes de
 * matériel et liens officiels (documentation ou fiche produit du fabricant).
 */
const KITS: ReadonlyArray<{ items: number; links: OfficialLink[] }> = [
  {
    items: 4,
    links: [
      { key: 'raspberry', href: 'https://www.raspberrypi.com/products/' },
      { key: 'openplotter', href: 'https://openplotter.readthedocs.io/' },
      {
        key: 'picanm',
        href: 'https://www.skpang.co.uk/products/pican-m-with-can-bus-micro-c-and-rs422-connector-3a-smps',
      },
      { key: 'ngt1', href: 'https://actisense.com/products/ngt-1-nmea-2000-to-pc-interface/' },
    ],
  },
  {
    items: 3,
    links: [{ key: 'venus_large', href: 'https://www.victronenergy.com/live/venus-os:large' }],
  },
  {
    items: 2,
    links: [{ key: 'signalk', href: 'https://signalk.org/' }],
  },
]

/** Liens officiels des étapes HTTPS (nom de domaine, certificat, reverse proxy). */
const HTTPS_LINKS: Record<number, OfficialLink[]> = {
  1: [{ key: 'duckdns', href: 'https://www.duckdns.org/' }],
  2: [{ key: 'letsencrypt', href: 'https://letsencrypt.org/docs/challenge-types/' }],
  3: [{ key: 'caddy', href: 'https://caddyserver.com/' }],
}

/** Fichiers de certificat lus par Signal K quand on lui confie le TLS. */
const SIGNALK_TLS_FILES = '~/.signalk/ssl-key.pem\n~/.signalk/ssl-cert.pem'

const ENGINE_ICONS: readonly InstrumentsMarketingIcon[] = ['engine', 'clock', 'alarm']

/**
 * Contenu éditorial de la page publique « Installer Signal K à bord » (#1022)
 * — jumeau de `MarketingInstrumentsContentService`.
 *
 * La copie vient de `marketing.installSignalK.*` (tutoiement marketing) et
 * des libellés partagés `marketing.features.shared.*`. La commande du plugin
 * est produite par `signalkPluginInstallCommand` : jamais recopiée dans le
 * JSON, elle ne peut pas dériver du script réellement servi (#1021).
 */
export default class MarketingInstallSignalKContentService {
  build(i18n: MarketingI18n): InstallSignalKMarketingContentProps {
    const locale = toAppLocale(i18n.locale)
    const params = { package: SIGNALK_PLUGIN_PACKAGE }
    const t = (key: string) => i18n.t(`marketing.installSignalK.${key}`, params)
    const shared = (key: string) => i18n.t(`marketing.features.shared.${key}`)
    const list = <T>(count: number, build: (n: number) => T): T[] =>
      Array.from({ length: count }, (_, index) => build(index + 1))
    const links = (prefix: string, items: OfficialLink[]): InstallSignalKExternalLink[] =>
      items.map(({ key, href }) => ({ label: t(`${prefix}_link_${key}`), href }))
    const header = (section: string) => ({
      eyebrow: t(`${section}_eyebrow`),
      title: t(`${section}_title`),
      titleHighlight: t(`${section}_title_highlight`),
      subtitle: t(`${section}_subtitle`),
    })
    const steps = (
      prefix: string,
      count: number,
      extras: (n: number) => Partial<InstallSignalKStep> = () => ({})
    ): InstallSignalKStep[] =>
      list(count, (n) => ({
        title: t(`${prefix}_step${n}_title`),
        description: t(`${prefix}_step${n}_desc`),
        ...extras(n),
      }))

    return {
      meta: { title: t('meta_title'), description: t('meta_description') },
      hero: {
        ...header('hero'),
        primaryCta: { label: shared('cta_primary'), href: '/signup?from=install-signalk' },
        secondaryCta: {
          label: t('hero_secondary_label'),
          href: marketingPath('instruments', locale),
        },
        reassurance: t('hero_reassurance'),
        durations: list(HERO_DURATION_COUNT, (n) => ({
          label: t(`hero_duration${n}_label`),
          value: t(`hero_duration${n}_value`),
        })),
      },
      kits: {
        ...header('kits'),
        budgetLabel: t('kits_budget_label'),
        durationLabel: t('kits_duration_label'),
        linksLabel: t('kits_links_label'),
        items: KITS.slice(0, INSTALL_SIGNALK_KIT_COUNT).map((kit, index) => {
          const n = index + 1
          return {
            title: t(`kit${n}_title`),
            description: t(`kit${n}_desc`),
            budget: t(`kit${n}_budget`),
            duration: t(`kit${n}_duration`),
            items: list(kit.items, (i) => t(`kit${n}_item${i}`)),
            links: links(`kit${n}`, kit.links),
          }
        }),
      },
      paths: {
        ...header('paths'),
        pluginTitle: t('paths_plugin_title'),
        pluginBadge: t('paths_plugin_badge'),
        pluginDescription: t('paths_plugin_desc'),
        appTitle: t('paths_app_title'),
        appDescription: t('paths_app_desc'),
        criterionHeader: t('paths_criterion_header'),
        rows: list(INSTALL_SIGNALK_COMPARISON_COUNT, (n) => ({
          criterion: t(`paths_row${n}_criterion`),
          plugin: t(`paths_row${n}_plugin`),
          app: t(`paths_row${n}_app`),
        })),
      },
      pluginHowTo: {
        ...header('plugin'),
        totalTime: t('plugin_total_time'),
        packageName: SIGNALK_PLUGIN_PACKAGE,
        steps: steps('plugin', INSTALL_SIGNALK_PLUGIN_STEP_COUNT, (n) =>
          n === 2
            ? {
                code: signalkPluginInstallCommand(SITE_URL, null),
                codeLabel: t('plugin_step2_code_label'),
                codeCaption: t('plugin_step2_code_caption'),
              }
            : {}
        ),
      },
      appHowTo: {
        ...header('app'),
        totalTime: t('app_total_time'),
        steps: steps('app', INSTALL_SIGNALK_APP_STEP_COUNT),
      },
      https: {
        ...header('https'),
        steps: steps('https', INSTALL_SIGNALK_HTTPS_STEP_COUNT, (n) => ({
          ...(n === 3
            ? {
                code: SIGNALK_TLS_FILES,
                codeLabel: t('https_step3_code_label'),
                codeCaption: t('https_step3_code_caption'),
              }
            : {}),
          ...(HTTPS_LINKS[n] ? { links: links('https', HTTPS_LINKS[n]) } : {}),
        })),
        fallbackTitle: t('https_fallback_title'),
        fallbackDescription: t('https_fallback_desc'),
        iphoneTitle: t('https_iphone_title'),
        iphoneNote: t('https_iphone_note'),
      },
      engines: {
        ...header('engines'),
        items: list(INSTALL_SIGNALK_ENGINES_COUNT, (n) => ({
          title: t(`engines${n}_title`),
          description: t(`engines${n}_desc`),
          icon: ENGINE_ICONS[n - 1],
        })),
      },
      troubleshooting: {
        ...header('trouble'),
        symptomHeader: t('trouble_symptom_header'),
        causeHeader: t('trouble_cause_header'),
        rows: list(INSTALL_SIGNALK_TROUBLESHOOTING_COUNT, (n) => ({
          symptom: t(`trouble_row${n}_symptom`),
          cause: t(`trouble_row${n}_cause`),
        })),
      },
      crossLinks: {
        eyebrow: shared('cross_eyebrow'),
        title: shared('cross_title'),
        linkLabel: shared('cross_link_label'),
        items: CROSS_LINKS.map(({ card, page }) => ({
          title: shared(`cards.${card}_title`),
          description: shared(`cards.${card}_desc`),
          href: marketingPath(page, locale),
        })),
      },
      faq: {
        eyebrow: shared('faq_eyebrow'),
        title: t('faq_title'),
        titleHighlight: t('faq_title_highlight'),
        items: list(INSTALL_SIGNALK_FAQ_COUNT, (n) => ({ q: t(`faq_q${n}`), a: t(`faq_a${n}`) })),
      },
      finalCta: {
        title: t('final_title'),
        titleHighlight: t('final_highlight'),
        subtitle: t('final_subtitle'),
        primaryCta: { label: shared('final_primary'), href: '/signup?from=install-signalk' },
        secondaryCta: { label: t('final_secondary'), href: marketingPath('instruments', locale) },
      },
    }
  }
}
