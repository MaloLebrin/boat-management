import router from '@adonisjs/core/services/router'

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

router
  .get('/sitemap.xml', ({ response }) => {
    const pages = [
      { loc: 'https://fleetai.app/en', priority: '1.0', changefreq: 'weekly' },
      { loc: 'https://fleetai.app/fr', priority: '1.0', changefreq: 'weekly' },
      { loc: 'https://fleetai.app/en/tarifs', priority: '0.8', changefreq: 'monthly' },
      { loc: 'https://fleetai.app/fr/tarifs', priority: '0.8', changefreq: 'monthly' },
      { loc: 'https://fleetai.app/design-system', priority: '0.5', changefreq: 'monthly' },
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`
    response.header('Content-Type', 'application/xml')
    return response.send(xml)
  })
  .as('sitemap')
