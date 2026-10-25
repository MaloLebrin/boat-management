import { marketingPath, toAppLocale } from '#shared/helpers/locale_path'
import type { MarketingPage } from '#shared/helpers/locale_path'
import { TELEMETRY_SAMPLE_RETENTION_DAYS } from '#shared/constants/data_retention'
import {
  BUILTIN_ALERT_RULES,
  INSTRUMENT_ALERT_MAX_RULES_PER_BOAT,
} from '#shared/constants/instrument_alerts'
import type { MarketingI18n } from '#shared/types/marketing'
import {
  INSTRUMENTS_MARKETING_BENEFIT_COUNT,
  INSTRUMENTS_MARKETING_CATEGORY_COUNT,
  INSTRUMENTS_MARKETING_FAQ_COUNT,
  INSTRUMENTS_MARKETING_SECURITY_COUNT,
} from '#shared/types/marketing_instruments'
import type {
  InstrumentsMarketingAlertCard,
  InstrumentsMarketingCardsSection,
  InstrumentsMarketingContentProps,
  InstrumentsMarketingIcon,
} from '#shared/types/marketing_instruments'

/** Cartes de maillage interne : clé de copie `features.shared.cards.*` + page cible. */
const CROSS_LINKS: ReadonlyArray<{ card: string; page: MarketingPage }> = [
  { card: 'maintenance', page: 'maintenance' },
  { card: 'fleet', page: 'fleet' },
  { card: 'aiAssistant', page: 'aiAssistant' },
]

const STEP_COUNT = 3
const INSTALL_COUNT = 3
const COMPAT_COUNT = 3

/** Pictogrammes par section, dans l'ordre des cartes. */
const ICONS = {
  categories: ['engine', 'navigation', 'power', 'tanks', 'environment', 'alarm'],
  benefits: ['clock', 'chart', 'alarm', 'position'],
  install: ['server', 'lock', 'key'],
  security: ['eye', 'key', 'users', 'archive'],
} as const satisfies Record<string, readonly InstrumentsMarketingIcon[]>

const KELVIN_OFFSET = 273.15
const PA_PER_BAR = 100_000
const HZ_TO_RPM = 60

/** Pictogramme de chaque règle intégrée (clé sans le préfixe `builtin:`). */
const ALERT_ICONS: Record<string, InstrumentsMarketingIcon> = {
  battery_low: 'power',
  engine_hot: 'temperature',
  shallow_water: 'depth',
  fuel_low: 'tanks',
  battery_voltage_low: 'power',
  oil_pressure_low: 'engine',
  engine_overrev: 'engine',
  signalk_alarm: 'alarm',
}

function builtinRule(key: string) {
  const rule = BUILTIN_ALERT_RULES.find((candidate) => candidate.key === key)
  if (!rule) throw new Error(`Règle d'alerte intégrée introuvable : ${key}`)
  return rule
}

/**
 * Contenu éditorial de la page « Instruments de bord connectés » (#995) —
 * jumeau de `PublicPartSearchContentService`.
 *
 * La copie vient de `marketing.features.instruments.*` (tutoiement marketing)
 * et des libellés partagés `marketing.features.shared.*`. Les durées de
 * conservation citées sont lues dans `TELEMETRY_SAMPLE_RETENTION_DAYS` : jamais
 * un nombre recopié dans le JSON, qui dériverait de la purge réelle.
 */
export default class MarketingInstrumentsContentService {
  build(i18n: MarketingI18n): InstrumentsMarketingContentProps {
    const locale = toAppLocale(i18n.locale)
    const params = {
      proDays: String(TELEMETRY_SAMPLE_RETENTION_DAYS.pro),
      enterpriseDays: String(TELEMETRY_SAMPLE_RETENTION_DAYS.enterprise),
    }
    const t = (key: string) => i18n.t(`marketing.features.instruments.${key}`, params)
    const shared = (key: string) => i18n.t(`marketing.features.shared.${key}`)

    const cards = (
      section: string,
      prefix: string,
      count: number,
      icons: readonly InstrumentsMarketingIcon[]
    ): InstrumentsMarketingCardsSection => ({
      eyebrow: t(`${section}_eyebrow`),
      title: t(`${section}_title`),
      titleHighlight: t(`${section}_title_highlight`),
      subtitle: t(`${section}_subtitle`),
      items: Array.from({ length: count }, (_, index) => ({
        title: t(`${prefix}${index + 1}_title`),
        description: t(`${prefix}${index + 1}_desc`),
        icon: icons[index],
      })),
    })

    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    const threshold = (key: string) => builtinRule(key).threshold
    const clearing = (key: string) => {
      const rule = builtinRule(key)
      return rule.operator === 'lt'
        ? rule.threshold + rule.hysteresis
        : rule.threshold - rule.hysteresis
    }
    // Les seuils affichés viennent des règles réellement évaluées : la page ne
    // peut pas promettre 20 % si la règle passe à 15 %.
    const alertParams = {
      count: String(BUILTIN_ALERT_RULES.length),
      batteryLow: number.format(threshold('builtin:battery_low') * 100),
      batteryClear: number.format(clearing('builtin:battery_low') * 100),
      engineHot: number.format(threshold('builtin:engine_hot') - KELVIN_OFFSET),
      engineClear: number.format(clearing('builtin:engine_hot') - KELVIN_OFFSET),
      depthLow: number.format(threshold('builtin:shallow_water')),
      depthClear: number.format(clearing('builtin:shallow_water')),
      fuelLow: number.format(threshold('builtin:fuel_low') * 100),
      fuelClear: number.format(clearing('builtin:fuel_low') * 100),
      voltLow: number.format(threshold('builtin:battery_voltage_low')),
      voltClear: number.format(clearing('builtin:battery_voltage_low')),
      oilLow: number.format(threshold('builtin:oil_pressure_low') / PA_PER_BAR),
      oilClear: number.format(clearing('builtin:oil_pressure_low') / PA_PER_BAR),
      rpmHigh: number.format(threshold('builtin:engine_overrev') * HZ_TO_RPM),
      rpmClear: number.format(clearing('builtin:engine_overrev') * HZ_TO_RPM),
      maxRules: String(INSTRUMENT_ALERT_MAX_RULES_PER_BOAT),
    }
    const alertText = (key: string) => i18n.t(`marketing.features.instruments.${key}`, alertParams)
    // Une carte par règle intégrée, dans l'ordre de `BUILTIN_ALERT_RULES` : une
    // règle ajoutée sans sa copie ressort en clé brute, ce que le test SEO refuse.
    const alertCards: InstrumentsMarketingAlertCard[] = BUILTIN_ALERT_RULES.map((rule) => {
      const slug = rule.key.replace('builtin:', '')
      return {
        title: alertText(`alert_${slug}_title`),
        description: alertText(`alert_${slug}_desc`),
        icon: ALERT_ICONS[slug] ?? 'alarm',
        severity: rule.severity,
        severityLabel: alertText(`severity_${rule.severity}`),
      }
    })

    return {
      meta: { title: t('meta_title'), description: t('meta_description') },
      hero: {
        eyebrow: t('hero_eyebrow'),
        title: t('hero_title'),
        titleHighlight: t('hero_title_highlight'),
        subtitle: t('hero_subtitle'),
        primaryCta: { label: shared('cta_primary'), href: '/signup?from=instruments' },
        secondaryCta: {
          label: t('hero_secondary_label'),
          href: marketingPath('pricing', locale),
        },
        reassurance: t('hero_reassurance'),
      },
      steps: {
        eyebrow: shared('steps_eyebrow'),
        title: t('steps_title'),
        subtitle: t('steps_subtitle'),
        items: Array.from({ length: STEP_COUNT }, (_, index) => ({
          step: String(index + 1),
          title: t(`step${index + 1}_title`),
          description: t(`step${index + 1}_desc`),
        })),
      },
      categories: cards(
        'categories',
        'cat',
        INSTRUMENTS_MARKETING_CATEGORY_COUNT,
        ICONS.categories
      ),
      benefits: cards('benefits', 'benefit', INSTRUMENTS_MARKETING_BENEFIT_COUNT, ICONS.benefits),
      alerts: {
        eyebrow: alertText('alerts_eyebrow'),
        title: alertText('alerts_title'),
        titleHighlight: alertText('alerts_title_highlight'),
        subtitle: alertText('alerts_subtitle'),
        items: alertCards,
        customTitle: alertText('alerts_custom_title'),
        customDescription: alertText('alerts_custom_desc'),
        team: alertText('alerts_team'),
      },
      compatibility: {
        eyebrow: t('compat_eyebrow'),
        title: t('compat_title'),
        titleHighlight: t('compat_title_highlight'),
        subtitle: t('compat_subtitle'),
        supportedTitle: t('compat_supported_title'),
        supported: Array.from({ length: COMPAT_COUNT }, (_, index) =>
          t(`compat_supported${index + 1}`)
        ),
        unsupportedTitle: t('compat_unsupported_title'),
        unsupported: Array.from({ length: COMPAT_COUNT }, (_, index) =>
          t(`compat_unsupported${index + 1}`)
        ),
        planNote: t('compat_plan_note'),
      },
      install: {
        ...cards('install', 'install', INSTALL_COUNT, ICONS.install),
        helpCta: { label: t('install_help_label'), href: marketingPath('help', locale) },
      },
      security: cards('security', 'security', INSTRUMENTS_MARKETING_SECURITY_COUNT, ICONS.security),
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
        items: Array.from({ length: INSTRUMENTS_MARKETING_FAQ_COUNT }, (_, index) => ({
          q: t(`faq_q${index + 1}`),
          a: t(`faq_a${index + 1}`),
        })),
      },
      finalCta: {
        title: t('final_title'),
        titleHighlight: t('final_highlight'),
        subtitle: t('final_subtitle'),
        primaryCta: { label: shared('final_primary'), href: '/signup?from=instruments' },
        secondaryCta: { label: shared('final_secondary'), href: marketingPath('pricing', locale) },
      },
    }
  }
}
