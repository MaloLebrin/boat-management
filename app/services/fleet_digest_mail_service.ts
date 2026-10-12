import edge from 'edge.js'
import i18nManager from '@adonisjs/i18n/services/main'
import { formatDateLong, formatDayMonth, formatMonthYear } from '#shared/helpers/date_format'
import { formatCurrency } from '#shared/helpers/number_format'
import { toAppLocale } from '#shared/helpers/locale_path'
import { REPORT_COST_CATEGORIES } from '#shared/types/reporting'
import type {
  FleetDigestAmountView,
  FleetDigestExpiry,
  FleetDigestList,
  FleetDigestRecipientContext,
  FleetDigestRowView,
  FleetDigestSectionView,
  MonthlyFleetReport,
  RenderedFleetDigest,
  WeeklyFleetDigest,
} from '#shared/types/fleet_digest'
import env from '#start/env'

type I18n = ReturnType<typeof i18nManager.locale>

/**
 * Rendu des rapports de flotte (#871) dans la langue du destinataire. Tous
 * les libellés sont traduits ici, une fois, en un modèle de vue partagé par
 * le HTML (gabarits Edge), la version texte et les aperçus `/dev/mails`.
 */
export default class FleetDigestMailService {
  i18nFor(locale: string | null): I18n {
    return i18nManager.locale(toAppLocale(locale))
  }

  async renderWeekly(
    digest: WeeklyFleetDigest,
    context: FleetDigestRecipientContext
  ): Promise<RenderedFleetDigest> {
    const i18n = this.i18nFor(context.locale)
    const locale = i18n.locale
    const appUrl = env.get('APP_URL')
    const t = (key: string, data?: Record<string, unknown>) =>
      i18n.t(`reports.digest.weekly.${key}`, data)
    const money = (amount: number) =>
      formatCurrency(amount, locale, { currency: digest.organization.currency })
    const day = (date: string) => formatDayMonth(date, locale)

    const sections: FleetDigestSectionView[] = []
    const push = <T>(
      key: string,
      list: FleetDigestList<T> | null,
      url: string,
      row: (item: T) => FleetDigestRowView
    ) => {
      if (!list || list.total === 0) return
      sections.push({
        key,
        title: t(`sections.${key}`, { count: list.total }),
        rows: list.items.map(row),
        more: this.#more(i18n, list),
        url: `${appUrl}${url}`,
      })
    }

    push('overdueTasks', digest.overdueTasks, '/planning', (task) => ({
      primary: task.title,
      secondary: t('rows.task', { boat: task.boatName, date: day(task.dueAt) }),
      url: `${appUrl}/boats/${task.boatId}?tab=maintenance`,
    }))
    push('upcomingTasks', digest.upcomingTasks, '/planning', (task) => ({
      primary: task.title,
      secondary: t('rows.task', { boat: task.boatName, date: day(task.dueAt) }),
      url: `${appUrl}/boats/${task.boatId}?tab=maintenance`,
    }))
    push('openIncidents', digest.openIncidents, '/dashboard', (incident) => ({
      primary: i18n.t(`incidents.type.${incident.type}`),
      secondary: t('rows.incident', { boat: incident.boatName, date: day(incident.occurredAt) }),
      url: `${appUrl}/boats/${incident.boatId}/incidents/${incident.id}`,
    }))
    push('expiring', digest.expiring, '/dashboard', (item) => ({
      primary: this.#expiryLabel(i18n, item),
      secondary: t(item.expired ? 'rows.expired' : 'rows.expires', {
        boat: item.boatName,
        date: day(item.expiresAt),
      }),
      url: `${appUrl}/boats/${item.boatId}?tab=${item.kind === 'document' ? 'documents' : 'safety'}`,
    }))
    push('reservations', digest.reservations, '/reservations', (reservation) => ({
      primary: reservation.clientName,
      secondary: t('rows.reservation', {
        boat: reservation.boatName,
        from: day(reservation.startsAt),
        to: day(reservation.endsAt),
      }),
      url: `${appUrl}/reservations`,
    }))
    push('overdueInvoices', digest.overdueInvoices, '/invoices?status=overdue', (invoice) => ({
      primary: invoice.clientName ? `${invoice.number} — ${invoice.clientName}` : invoice.number,
      secondary: invoice.dueAt
        ? t('rows.invoice', { amount: money(invoice.total), date: day(invoice.dueAt) })
        : money(invoice.total),
      url: `${appUrl}/invoices/${invoice.id}`,
    }))

    const expenses =
      digest.expenses.total > 0
        ? {
            title: t('sections.expenses'),
            total: t('expensesTotal', { amount: money(digest.expenses.total) }),
            lines: REPORT_COST_CATEGORIES.filter((c) => digest.expenses[c] > 0).map((c) => ({
              label: i18n.t(`budget.categories.${c}`),
              value: money(digest.expenses[c]),
            })),
          }
        : null

    const view = {
      branding: context.branding,
      greeting: i18n.t('reports.digest.greeting', { name: context.name ?? context.to }),
      heading: t('heading', { org: digest.organization.name }),
      intro: t('intro', {
        from: formatDateLong(digest.upcoming.from, locale),
        to: formatDateLong(digest.upcoming.to, locale),
      }),
      sections,
      expenses,
      ctaUrl: `${appUrl}/dashboard`,
      ctaLabel: t('cta'),
      ...this.#footer(i18n, digest.organization.name, 'weekly', context.unsubscribeUrl),
    }

    const subject = t('subject', {
      org: digest.organization.name,
      date: formatDayMonth(digest.upcoming.from, locale),
    })
    const html = await edge.render('emails/weekly_digest', view)
    const text = [
      view.greeting,
      `${view.heading}\n${view.intro}`,
      ...sections.map((section) => this.#sectionText(section)),
      expenses &&
        [
          expenses.title,
          ...expenses.lines.map((l) => `- ${l.label} : ${l.value}`),
          expenses.total,
        ].join('\n'),
      `${view.ctaLabel}\n${view.ctaUrl}`,
      this.#footerText(view),
    ]
      .filter((part): part is string => Boolean(part))
      .join('\n\n')

    return { subject, text, html }
  }

  async renderMonthly(
    report: MonthlyFleetReport,
    context: FleetDigestRecipientContext
  ): Promise<RenderedFleetDigest> {
    const i18n = this.i18nFor(context.locale)
    const view = this.monthlyView(report, i18n)
    const t = (key: string, data?: Record<string, unknown>) =>
      i18n.t(`reports.digest.monthly.${key}`, data)
    const appUrl = env.get('APP_URL')

    const page = {
      ...view,
      branding: context.branding,
      greeting: i18n.t('reports.digest.greeting', { name: context.name ?? context.to }),
      attachment: t('attachment'),
      ctaUrl: `${appUrl}/reports`,
      ctaLabel: t('cta'),
      ...this.#footer(i18n, report.organization.name, 'monthly', context.unsubscribeUrl),
    }

    const subject = t('subject', { org: report.organization.name, month: view.monthLabel })
    const html = await edge.render('emails/monthly_report', page)
    const text = [
      page.greeting,
      page.heading,
      page.kpis.map((kpi) => `- ${kpi.label} : ${kpi.value}`).join('\n'),
      page.topCategories.length > 0 &&
        [
          page.topCategoriesTitle,
          ...page.topCategories.map((c) => `- ${c.label} : ${c.value}`),
        ].join('\n'),
      page.attachment,
      `${page.ctaLabel}\n${page.ctaUrl}`,
      this.#footerText(page),
    ]
      .filter((part): part is string => Boolean(part))
      .join('\n\n')

    return { subject, text, html }
  }

  /**
   * Modèle de vue du rapport mensuel, commun à l'e-mail et au PDF : titres,
   * indicateurs et lignes par bateau déjà formatés.
   */
  monthlyView(report: MonthlyFleetReport, i18n: I18n) {
    const locale = i18n.locale
    const t = (key: string, data?: Record<string, unknown>) =>
      i18n.t(`reports.digest.monthly.${key}`, data)
    const money = (amount: number) =>
      formatCurrency(amount, locale, { currency: report.organization.currency })
    const number = (value: number) => i18n.formatNumber(value, { maximumFractionDigits: 1 })
    const percent = (rate: number) => i18n.formatNumber(rate / 100, { style: 'percent' })
    const monthLabel = formatMonthYear(`${report.month}-01`, locale)

    const kpis: FleetDigestAmountView[] = [
      { label: t('kpi.costs'), value: money(report.costs.total) },
      { label: t('kpi.previousCosts'), value: money(report.previousCosts) },
      { label: t('kpi.engineHours'), value: number(report.engineHours) },
      { label: t('kpi.distance'), value: number(report.distanceNm) },
      {
        label: t('kpi.maintenance'),
        value: t('kpi.maintenanceValue', {
          completed: report.maintenance.completed,
          planned: report.maintenance.planned,
        }),
      },
      { label: t('kpi.performed'), value: number(report.maintenance.performed) },
    ]
    if (report.rental) {
      kpis.push(
        { label: t('kpi.revenue'), value: money(report.rental.revenue) },
        { label: t('kpi.occupancy'), value: percent(report.rental.occupancyRate) }
      )
    }

    return {
      heading: t('heading', { org: report.organization.name, month: monthLabel }),
      monthLabel,
      period: t('period', {
        from: formatDateLong(report.period.from, locale),
        to: formatDateLong(report.period.to, locale),
      }),
      kpis,
      topCategoriesTitle: t('topCategories'),
      topCategories: report.topCategories.map((row) => ({
        label: i18n.t(`budget.categories.${row.category}`),
        value: money(row.amount),
      })),
      boatsTitle: t('boats.title'),
      boatColumns: {
        boat: t('boats.boat'),
        costs: t('boats.costs'),
        engineHours: t('boats.engineHours'),
        revenue: t('boats.revenue'),
        occupancy: t('boats.occupancy'),
      },
      showRental: report.rental !== null,
      boats: report.boats.map((boat) => ({
        name: boat.boatName,
        costs: money(boat.costs),
        engineHours: number(boat.engineHours),
        revenue: money(boat.rentalRevenue),
        occupancy: percent(boat.occupancyRate),
      })),
    }
  }

  #expiryLabel(i18n: I18n, item: FleetDigestExpiry): string {
    if (item.customLabel) return item.customLabel
    return item.kind === 'document'
      ? i18n.t(`boats.adminDocs.types.${item.type}`)
      : i18n.t(`boats.options.safetyEquipmentType.${item.type}`)
  }

  #more(i18n: I18n, list: FleetDigestList<unknown>): string | null {
    const rest = list.total - list.items.length
    return rest > 0 ? i18n.t('reports.digest.more', { count: rest }) : null
  }

  #footer(
    i18n: I18n,
    organizationName: string,
    kind: 'weekly' | 'monthly',
    unsubscribeUrl: string | null
  ) {
    return {
      reason: i18n.t('reports.digest.reason', { org: organizationName }),
      manageUrl: `${env.get('APP_URL')}/settings/notifications`,
      manageLabel: i18n.t('reports.digest.manage'),
      unsubscribeUrl,
      unsubscribeLabel: i18n.t(`reports.digest.${kind}.unsubscribe`),
    }
  }

  #sectionText(section: FleetDigestSectionView): string {
    return [
      section.title,
      ...section.rows.map((row) => `- ${row.primary} (${row.secondary})`),
      section.more,
    ]
      .filter(Boolean)
      .join('\n')
  }

  #footerText(view: {
    reason: string
    manageLabel: string
    manageUrl: string
    unsubscribeLabel: string
    unsubscribeUrl: string | null
  }): string {
    return [
      view.reason,
      `${view.manageLabel}\n${view.manageUrl}`,
      view.unsubscribeUrl && `${view.unsubscribeLabel}\n${view.unsubscribeUrl}`,
    ]
      .filter(Boolean)
      .join('\n')
  }
}
