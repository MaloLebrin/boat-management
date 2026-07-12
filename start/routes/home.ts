import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const HomeController = () => import('#controllers/home_controller')

router.get('/dashboard', [HomeController, 'index']).as('dashboard').use(middleware.auth())

router
  .on('/design-system')
  .renderInertia('design_system', {
    meta: {
      title: 'Design System – FleetAi',
      description:
        'Foundations, components and patterns of the FleetAi design system. Built on Tailwind CSS v4, Vue 3 and Instrument Serif.',
    },
  })
  .as('design_system')

const SITE_URL = 'https://fleetai.app'

/**
 * Pages marketing localisées (en/fr) : chaque entrée génère une URL par locale,
 * annotée avec les alternates hreflang (+ x-default → en) pour l'indexation
 * multilingue. Les slugs sont la source de vérité de `start/routes/marketing.ts`.
 */
const LOCALIZED_PAGES = [
  { en: '/en', fr: '/fr', priority: '1.0', changefreq: 'weekly' },
  { en: '/en/tarifs', fr: '/fr/tarifs', priority: '0.8', changefreq: 'monthly' },
  {
    en: '/en/maintenance-cost-simulator',
    fr: '/fr/simulateur-cout-entretien',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    en: '/en/boat-maintenance-cost',
    fr: '/fr/cout-entretien-bateau',
    priority: '0.7',
    changefreq: 'monthly',
  },
  { en: '/en/about', fr: '/fr/a-propos', priority: '0.5', changefreq: 'monthly' },
  { en: '/en/privacy', fr: '/fr/confidentialite', priority: '0.3', changefreq: 'yearly' },
] as const

/** Pages servies sur une URL unique (pas d'alternate hreflang). */
const STANDALONE_PAGES = [
  { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
  { loc: '/design-system', priority: '0.5', changefreq: 'monthly' },
] as const

router
  .get('/sitemap.xml', ({ response }) => {
    const alternatesFor = (en: string, fr: string) =>
      [
        `    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}${en}" />`,
        `    <xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}${fr}" />`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${en}" />`,
      ].join('\n')

    const localizedUrls = LOCALIZED_PAGES.flatMap((p) =>
      [p.en, p.fr].map(
        (loc) => `  <url>
    <loc>${SITE_URL}${loc}</loc>
${alternatesFor(p.en, p.fr)}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
      )
    )

    const standaloneUrls = STANDALONE_PAGES.map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...localizedUrls, ...standaloneUrls].join('\n')}
</urlset>`
    response.header('Content-Type', 'application/xml')
    return response.send(xml)
  })
  .as('sitemap')
