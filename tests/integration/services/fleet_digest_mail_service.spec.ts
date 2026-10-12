import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { OrganizationFactory } from '#database/factories/organization_factory'
import FleetDigestMailService from '#services/fleet_digest_mail_service'
import FleetReportPdfService from '#services/fleet_report_pdf_service'
import { emptyCostBreakdown } from '#shared/helpers/reporting'
import type {
  FleetDigestRecipientContext,
  MonthlyFleetReport,
  WeeklyFleetDigest,
} from '#shared/types/fleet_digest'

/**
 * Rendu des rapports de flotte (#871) : langue du destinataire, sections
 * présentes seulement quand elles ont du contenu, lien de désinscription,
 * marque blanche, et PDF du rapport mensuel.
 */

const task = { id: 1, title: 'Vidange moteur', boatId: 3, boatName: 'Ondine', dueAt: '2026-10-02' }

function weekly(overrides: Partial<WeeklyFleetDigest> = {}): WeeklyFleetDigest {
  return {
    organization: { id: 1, name: 'Yacht Club', currency: 'EUR' },
    week: '2026-W42',
    upcoming: { from: '2026-10-12', to: '2026-10-18' },
    past: { from: '2026-10-05', to: '2026-10-11' },
    overdueTasks: { total: 7, items: [task] },
    upcomingTasks: { total: 0, items: [] },
    openIncidents: { total: 0, items: [] },
    expiring: {
      total: 1,
      items: [
        {
          kind: 'document',
          id: 2,
          boatId: 3,
          boatName: 'Ondine',
          type: 'insurance',
          customLabel: null,
          expiresAt: '2026-10-20',
          expired: false,
        },
      ],
    },
    reservations: null,
    expenses: { ...emptyCostBreakdown(), fuel: 120, total: 120 },
    overdueInvoices: null,
    ...overrides,
  }
}

function monthly(overrides: Partial<MonthlyFleetReport> = {}): MonthlyFleetReport {
  return {
    organization: { id: 1, name: 'Yacht Club', currency: 'EUR' },
    month: '2026-09',
    period: { preset: 'month', from: '2026-09-01', to: '2026-09-30', days: 30 },
    costs: { ...emptyCostBreakdown(), maintenance: 800, fuel: 200, total: 1000 },
    previousCosts: 900,
    topCategories: [
      { category: 'maintenance', amount: 800 },
      { category: 'fuel', amount: 200 },
    ],
    engineHours: 12.5,
    distanceNm: 80,
    maintenance: { planned: 4, completed: 3, performed: 5 },
    rental: null,
    boats: [
      {
        boatId: 3,
        boatName: 'Ondine',
        costs: 1000,
        engineHours: 12.5,
        rentalRevenue: 0,
        occupancyRate: 0,
      },
    ],
    ...overrides,
  }
}

function context(
  overrides: Partial<FleetDigestRecipientContext> = {}
): FleetDigestRecipientContext {
  return {
    to: 'jean@example.com',
    name: 'Jean',
    locale: 'fr',
    branding: null,
    unsubscribeUrl: 'https://app.test/reports/digest/unsubscribe/token',
    ...overrides,
  }
}

test.group('FleetDigestMailService.renderWeekly (#871)', () => {
  test('renders the sections with content, in the recipient language', async ({ assert }) => {
    const mailer = await app.container.make(FleetDigestMailService)

    const fr = await mailer.renderWeekly(weekly(), context())
    assert.include(fr.subject, 'Yacht Club')
    assert.include(fr.html, '7 tâches en retard')
    assert.include(fr.html, 'Vidange moteur')
    assert.include(fr.html, '+ 6 autres')
    assert.include(fr.text, "Attestation d'assurance")
    assert.include(fr.html, 'Dépenses de la semaine passée')
    assert.include(fr.html, 'https://app.test/reports/digest/unsubscribe/token')
    // Pas de section vide, ni de section d'un module absent.
    assert.notInclude(fr.html, 'incident')
    assert.notInclude(fr.html, 'réservation')
    assert.include(fr.text, 'Vidange moteur')

    const en = await mailer.renderWeekly(weekly(), context({ locale: 'en' }))
    assert.include(en.html, '7 overdue tasks')
    assert.include(en.html, '+ 6 more')
    assert.include(en.text, 'Stop the weekly digest')
  })

  test('white-label branding dresses the email', async ({ assert }) => {
    const mailer = await app.container.make(FleetDigestMailService)
    const rendered = await mailer.renderWeekly(
      weekly(),
      context({ branding: { appName: 'Marina Pro', primaryColor: '#123456', logoUrl: null } })
    )
    assert.include(rendered.html, 'Marina Pro')
    assert.include(rendered.html, '#123456')
  })
})

test.group('FleetDigestMailService.renderMonthly + PDF (#871)', () => {
  test('renders the month figures, rental only with the module', async ({ assert }) => {
    const mailer = await app.container.make(FleetDigestMailService)

    const withoutRental = await mailer.renderMonthly(monthly(), context())
    assert.include(withoutRental.subject, 'septembre 2026')
    assert.include(withoutRental.html, '3 faits sur 4')
    assert.include(withoutRental.html, 'Principaux postes de coût')
    assert.notInclude(withoutRental.html, 'Revenus de location')

    const withRental = await mailer.renderMonthly(
      monthly({ rental: { revenue: 4200, rentalDays: 12, occupancyRate: 40 } }),
      context({ locale: 'en' })
    )
    assert.include(withRental.subject, 'September 2026')
    assert.include(withRental.html, 'Rental revenue')
    assert.include(withRental.html, '40%')
  })

  test('the PDF is generated, named in the recipient language', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const mailer = await app.container.make(FleetDigestMailService)
    const pdf = await app.container.make(FleetReportPdfService)

    const fr = await pdf.generate(monthly(), org, mailer.i18nFor('fr'))
    assert.equal(fr.filename, 'rapport-flotte-2026-09.pdf')
    assert.equal(fr.buffer.subarray(0, 4).toString(), '%PDF')

    const en = await pdf.generate(
      monthly({ rental: { revenue: 4200, rentalDays: 12, occupancyRate: 40 } }),
      org,
      mailer.i18nFor('en')
    )
    assert.equal(en.filename, 'fleet-report-2026-09.pdf')
  })
})
