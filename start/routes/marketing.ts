import { middleware } from '#start/kernel'
import DashboardService from '#services/dashboard_service'
import router from '@adonisjs/core/services/router'

router.get('/', ({ response }) => response.redirect('/en')).as('root')

router
  .group(() => {
    router
      .get('/', ({ inertia, i18n }) => {
        return inertia.render('marketing/home', {
          t: {
            brand: {
              name: i18n.t('marketing.brand.name'),
              tagline: i18n.t('marketing.brand.tagline'),
            },
            nav: {
              pricing: i18n.t('marketing.nav.pricing'),
              login: i18n.t('marketing.nav.login'),
              signup: i18n.t('marketing.nav.signup'),
            },
            meta: {
              title: `${i18n.t('marketing.brand.name')} – ${i18n.t('marketing.home.hero.title')}`,
              description: i18n.t('marketing.home.hero.subtitle'),
            },
            home: {
              hero: {
                eyebrow: i18n.t('marketing.home.hero.eyebrow'),
                title: i18n.t('marketing.home.hero.title'),
                subtitle: i18n.t('marketing.home.hero.subtitle'),
              },
              cta: {
                primary: i18n.t('marketing.home.cta.primary'),
                secondary: i18n.t('marketing.home.cta.secondary'),
              },
              socialProof: {
                title: i18n.t('marketing.home.sections.social_proof.title'),
                logos: [
                  i18n.t('marketing.home.sections.social_proof.logo1'),
                  i18n.t('marketing.home.sections.social_proof.logo2'),
                  i18n.t('marketing.home.sections.social_proof.logo3'),
                  i18n.t('marketing.home.sections.social_proof.logo4'),
                  i18n.t('marketing.home.sections.social_proof.logo5'),
                  i18n.t('marketing.home.sections.social_proof.logo6'),
                ],
              },
              stats: {
                title: i18n.t('marketing.home.sections.stats.title'),
                items: [
                  {
                    label: i18n.t('marketing.home.sections.stats.item1_label'),
                    value: i18n.t('marketing.home.sections.stats.item1_value'),
                    hint: i18n.t('marketing.home.sections.stats.item1_hint'),
                  },
                  {
                    label: i18n.t('marketing.home.sections.stats.item2_label'),
                    value: i18n.t('marketing.home.sections.stats.item2_value'),
                    hint: i18n.t('marketing.home.sections.stats.item2_hint'),
                  },
                  {
                    label: i18n.t('marketing.home.sections.stats.item3_label'),
                    value: i18n.t('marketing.home.sections.stats.item3_value'),
                    hint: i18n.t('marketing.home.sections.stats.item3_hint'),
                  },
                ],
              },
              problem: {
                title: i18n.t('marketing.home.sections.problem.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.problem.item1_title'),
                    description: i18n.t('marketing.home.sections.problem.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.problem.item2_title'),
                    description: i18n.t('marketing.home.sections.problem.item2_description'),
                  },
                ],
              },
              features: {
                title: i18n.t('marketing.home.sections.features.title'),
                subtitle: i18n.t('marketing.home.sections.features.subtitle'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.features.item1_title'),
                    description: i18n.t('marketing.home.sections.features.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item2_title'),
                    description: i18n.t('marketing.home.sections.features.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item3_title'),
                    description: i18n.t('marketing.home.sections.features.item3_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item4_title'),
                    description: i18n.t('marketing.home.sections.features.item4_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item5_title'),
                    description: i18n.t('marketing.home.sections.features.item5_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item6_title'),
                    description: i18n.t('marketing.home.sections.features.item6_description'),
                  },
                ],
              },
              useCases: {
                title: i18n.t('marketing.home.sections.use_cases.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.use_cases.item1_title'),
                    description: i18n.t('marketing.home.sections.use_cases.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.use_cases.item2_title'),
                    description: i18n.t('marketing.home.sections.use_cases.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.use_cases.item3_title'),
                    description: i18n.t('marketing.home.sections.use_cases.item3_description'),
                  },
                ],
              },
              preview: {
                title: i18n.t('marketing.home.sections.preview.title'),
                subtitle: i18n.t('marketing.home.sections.preview.subtitle'),
              },
              security: {
                title: i18n.t('marketing.home.sections.security.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.security.item1_title'),
                    description: i18n.t('marketing.home.sections.security.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.security.item2_title'),
                    description: i18n.t('marketing.home.sections.security.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.security.item3_title'),
                    description: i18n.t('marketing.home.sections.security.item3_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.security.item4_title'),
                    description: i18n.t('marketing.home.sections.security.item4_description'),
                  },
                ],
              },
              faq: {
                title: i18n.t('marketing.home.sections.faq.title'),
                items: [
                  {
                    q: i18n.t('marketing.home.sections.faq.item1_q'),
                    a: i18n.t('marketing.home.sections.faq.item1_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item2_q'),
                    a: i18n.t('marketing.home.sections.faq.item2_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item3_q'),
                    a: i18n.t('marketing.home.sections.faq.item3_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item4_q'),
                    a: i18n.t('marketing.home.sections.faq.item4_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item5_q'),
                    a: i18n.t('marketing.home.sections.faq.item5_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item6_q'),
                    a: i18n.t('marketing.home.sections.faq.item6_a'),
                  },
                ],
              },
              finalCta: {
                title: i18n.t('marketing.home.sections.final_cta.title'),
                subtitle: i18n.t('marketing.home.sections.final_cta.subtitle'),
                primary: i18n.t('marketing.home.sections.final_cta.primary'),
                secondary: i18n.t('marketing.home.sections.final_cta.secondary'),
              },
            },
          },
        })
      })
      .as('marketing.en.home')
    router
      .get('/tarifs', ({ inertia, i18n }) => {
        return inertia.render('marketing/pricing', {
          t: {
            brand: {
              name: i18n.t('marketing.brand.name'),
            },
            nav: {
              login: i18n.t('marketing.nav.login'),
              signup: i18n.t('marketing.nav.signup'),
            },
            meta: {
              title: `${i18n.t('marketing.pricing.title')} – ${i18n.t('marketing.brand.name')}`,
              description: i18n.t('marketing.pricing.subtitle'),
            },
            pricing: {
              title: i18n.t('marketing.pricing.title'),
              subtitle: i18n.t('marketing.pricing.subtitle'),
              note: i18n.t('marketing.pricing.note'),
              plans: {
                starter: {
                  name: i18n.t('marketing.pricing.plans.starter.name'),
                  price: i18n.t('marketing.pricing.plans.starter.price'),
                  badge: i18n.t('marketing.pricing.plans.starter.badge'),
                  features: [
                    i18n.t('marketing.pricing.plans.starter.feature1'),
                    i18n.t('marketing.pricing.plans.starter.feature2'),
                    i18n.t('marketing.pricing.plans.starter.feature3'),
                  ],
                },
                pro: {
                  name: i18n.t('marketing.pricing.plans.pro.name'),
                  price: i18n.t('marketing.pricing.plans.pro.price'),
                  badge: i18n.t('marketing.pricing.plans.pro.badge'),
                  features: [
                    i18n.t('marketing.pricing.plans.pro.feature1'),
                    i18n.t('marketing.pricing.plans.pro.feature2'),
                    i18n.t('marketing.pricing.plans.pro.feature3'),
                  ],
                },
                enterprise: {
                  name: i18n.t('marketing.pricing.plans.enterprise.name'),
                  price: i18n.t('marketing.pricing.plans.enterprise.price'),
                  badge: i18n.t('marketing.pricing.plans.enterprise.badge'),
                  features: [
                    i18n.t('marketing.pricing.plans.enterprise.feature1'),
                    i18n.t('marketing.pricing.plans.enterprise.feature2'),
                    i18n.t('marketing.pricing.plans.enterprise.feature3'),
                  ],
                },
              },
              compare: {
                title: i18n.t('marketing.pricing.compare.title'),
                items: [
                  i18n.t('marketing.pricing.compare.item1'),
                  i18n.t('marketing.pricing.compare.item2'),
                  i18n.t('marketing.pricing.compare.item3'),
                  i18n.t('marketing.pricing.compare.item4'),
                  i18n.t('marketing.pricing.compare.item5'),
                  i18n.t('marketing.pricing.compare.item6'),
                ],
              },
              faq: {
                title: i18n.t('marketing.pricing.faq.title'),
                items: [
                  {
                    q: i18n.t('marketing.pricing.faq.item1_q'),
                    a: i18n.t('marketing.pricing.faq.item1_a'),
                  },
                  {
                    q: i18n.t('marketing.pricing.faq.item2_q'),
                    a: i18n.t('marketing.pricing.faq.item2_a'),
                  },
                  {
                    q: i18n.t('marketing.pricing.faq.item3_q'),
                    a: i18n.t('marketing.pricing.faq.item3_a'),
                  },
                ],
              },
              cta: {
                title: i18n.t('marketing.pricing.cta.title'),
                subtitle: i18n.t('marketing.pricing.cta.subtitle'),
                primary: i18n.t('marketing.pricing.cta.primary'),
                secondary: i18n.t('marketing.pricing.cta.secondary'),
              },
            },
          },
        })
      })
      .as('marketing.en.pricing')
  })
  .prefix('en')

router
  .group(() => {
    router
      .get('/', ({ inertia, i18n }) => {
        return inertia.render('marketing/home', {
          t: {
            brand: {
              name: i18n.t('marketing.brand.name'),
              tagline: i18n.t('marketing.brand.tagline'),
            },
            nav: {
              pricing: i18n.t('marketing.nav.pricing'),
              login: i18n.t('marketing.nav.login'),
              signup: i18n.t('marketing.nav.signup'),
            },
            meta: {
              title: `${i18n.t('marketing.brand.name')} – ${i18n.t('marketing.home.hero.title')}`,
              description: i18n.t('marketing.home.hero.subtitle'),
            },
            home: {
              hero: {
                eyebrow: i18n.t('marketing.home.hero.eyebrow'),
                title: i18n.t('marketing.home.hero.title'),
                subtitle: i18n.t('marketing.home.hero.subtitle'),
              },
              cta: {
                primary: i18n.t('marketing.home.cta.primary'),
                secondary: i18n.t('marketing.home.cta.secondary'),
              },
              socialProof: {
                title: i18n.t('marketing.home.sections.social_proof.title'),
                logos: [
                  i18n.t('marketing.home.sections.social_proof.logo1'),
                  i18n.t('marketing.home.sections.social_proof.logo2'),
                  i18n.t('marketing.home.sections.social_proof.logo3'),
                  i18n.t('marketing.home.sections.social_proof.logo4'),
                  i18n.t('marketing.home.sections.social_proof.logo5'),
                  i18n.t('marketing.home.sections.social_proof.logo6'),
                ],
              },
              stats: {
                title: i18n.t('marketing.home.sections.stats.title'),
                items: [
                  {
                    label: i18n.t('marketing.home.sections.stats.item1_label'),
                    value: i18n.t('marketing.home.sections.stats.item1_value'),
                    hint: i18n.t('marketing.home.sections.stats.item1_hint'),
                  },
                  {
                    label: i18n.t('marketing.home.sections.stats.item2_label'),
                    value: i18n.t('marketing.home.sections.stats.item2_value'),
                    hint: i18n.t('marketing.home.sections.stats.item2_hint'),
                  },
                  {
                    label: i18n.t('marketing.home.sections.stats.item3_label'),
                    value: i18n.t('marketing.home.sections.stats.item3_value'),
                    hint: i18n.t('marketing.home.sections.stats.item3_hint'),
                  },
                ],
              },
              problem: {
                title: i18n.t('marketing.home.sections.problem.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.problem.item1_title'),
                    description: i18n.t('marketing.home.sections.problem.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.problem.item2_title'),
                    description: i18n.t('marketing.home.sections.problem.item2_description'),
                  },
                ],
              },
              features: {
                title: i18n.t('marketing.home.sections.features.title'),
                subtitle: i18n.t('marketing.home.sections.features.subtitle'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.features.item1_title'),
                    description: i18n.t('marketing.home.sections.features.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item2_title'),
                    description: i18n.t('marketing.home.sections.features.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item3_title'),
                    description: i18n.t('marketing.home.sections.features.item3_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item4_title'),
                    description: i18n.t('marketing.home.sections.features.item4_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item5_title'),
                    description: i18n.t('marketing.home.sections.features.item5_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.features.item6_title'),
                    description: i18n.t('marketing.home.sections.features.item6_description'),
                  },
                ],
              },
              useCases: {
                title: i18n.t('marketing.home.sections.use_cases.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.use_cases.item1_title'),
                    description: i18n.t('marketing.home.sections.use_cases.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.use_cases.item2_title'),
                    description: i18n.t('marketing.home.sections.use_cases.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.use_cases.item3_title'),
                    description: i18n.t('marketing.home.sections.use_cases.item3_description'),
                  },
                ],
              },
              preview: {
                title: i18n.t('marketing.home.sections.preview.title'),
                subtitle: i18n.t('marketing.home.sections.preview.subtitle'),
              },
              security: {
                title: i18n.t('marketing.home.sections.security.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.security.item1_title'),
                    description: i18n.t('marketing.home.sections.security.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.security.item2_title'),
                    description: i18n.t('marketing.home.sections.security.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.security.item3_title'),
                    description: i18n.t('marketing.home.sections.security.item3_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.security.item4_title'),
                    description: i18n.t('marketing.home.sections.security.item4_description'),
                  },
                ],
              },
              faq: {
                title: i18n.t('marketing.home.sections.faq.title'),
                items: [
                  {
                    q: i18n.t('marketing.home.sections.faq.item1_q'),
                    a: i18n.t('marketing.home.sections.faq.item1_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item2_q'),
                    a: i18n.t('marketing.home.sections.faq.item2_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item3_q'),
                    a: i18n.t('marketing.home.sections.faq.item3_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item4_q'),
                    a: i18n.t('marketing.home.sections.faq.item4_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item5_q'),
                    a: i18n.t('marketing.home.sections.faq.item5_a'),
                  },
                  {
                    q: i18n.t('marketing.home.sections.faq.item6_q'),
                    a: i18n.t('marketing.home.sections.faq.item6_a'),
                  },
                ],
              },
              finalCta: {
                title: i18n.t('marketing.home.sections.final_cta.title'),
                subtitle: i18n.t('marketing.home.sections.final_cta.subtitle'),
                primary: i18n.t('marketing.home.sections.final_cta.primary'),
                secondary: i18n.t('marketing.home.sections.final_cta.secondary'),
              },
            },
          },
        })
      })
      .as('marketing.fr.home')
    router
      .get('/tarifs', ({ inertia, i18n }) => {
        return inertia.render('marketing/pricing', {
          t: {
            brand: {
              name: i18n.t('marketing.brand.name'),
            },
            nav: {
              login: i18n.t('marketing.nav.login'),
              signup: i18n.t('marketing.nav.signup'),
            },
            meta: {
              title: `${i18n.t('marketing.pricing.title')} – ${i18n.t('marketing.brand.name')}`,
              description: i18n.t('marketing.pricing.subtitle'),
            },
            pricing: {
              title: i18n.t('marketing.pricing.title'),
              subtitle: i18n.t('marketing.pricing.subtitle'),
              note: i18n.t('marketing.pricing.note'),
              plans: {
                starter: {
                  name: i18n.t('marketing.pricing.plans.starter.name'),
                  price: i18n.t('marketing.pricing.plans.starter.price'),
                  badge: i18n.t('marketing.pricing.plans.starter.badge'),
                  features: [
                    i18n.t('marketing.pricing.plans.starter.feature1'),
                    i18n.t('marketing.pricing.plans.starter.feature2'),
                    i18n.t('marketing.pricing.plans.starter.feature3'),
                  ],
                },
                pro: {
                  name: i18n.t('marketing.pricing.plans.pro.name'),
                  price: i18n.t('marketing.pricing.plans.pro.price'),
                  badge: i18n.t('marketing.pricing.plans.pro.badge'),
                  features: [
                    i18n.t('marketing.pricing.plans.pro.feature1'),
                    i18n.t('marketing.pricing.plans.pro.feature2'),
                    i18n.t('marketing.pricing.plans.pro.feature3'),
                  ],
                },
                enterprise: {
                  name: i18n.t('marketing.pricing.plans.enterprise.name'),
                  price: i18n.t('marketing.pricing.plans.enterprise.price'),
                  badge: i18n.t('marketing.pricing.plans.enterprise.badge'),
                  features: [
                    i18n.t('marketing.pricing.plans.enterprise.feature1'),
                    i18n.t('marketing.pricing.plans.enterprise.feature2'),
                    i18n.t('marketing.pricing.plans.enterprise.feature3'),
                  ],
                },
              },
              compare: {
                title: i18n.t('marketing.pricing.compare.title'),
                items: [
                  i18n.t('marketing.pricing.compare.item1'),
                  i18n.t('marketing.pricing.compare.item2'),
                  i18n.t('marketing.pricing.compare.item3'),
                  i18n.t('marketing.pricing.compare.item4'),
                  i18n.t('marketing.pricing.compare.item5'),
                  i18n.t('marketing.pricing.compare.item6'),
                ],
              },
              faq: {
                title: i18n.t('marketing.pricing.faq.title'),
                items: [
                  {
                    q: i18n.t('marketing.pricing.faq.item1_q'),
                    a: i18n.t('marketing.pricing.faq.item1_a'),
                  },
                  {
                    q: i18n.t('marketing.pricing.faq.item2_q'),
                    a: i18n.t('marketing.pricing.faq.item2_a'),
                  },
                  {
                    q: i18n.t('marketing.pricing.faq.item3_q'),
                    a: i18n.t('marketing.pricing.faq.item3_a'),
                  },
                ],
              },
              cta: {
                title: i18n.t('marketing.pricing.cta.title'),
                subtitle: i18n.t('marketing.pricing.cta.subtitle'),
                primary: i18n.t('marketing.pricing.cta.primary'),
                secondary: i18n.t('marketing.pricing.cta.secondary'),
              },
            },
          },
        })
      })
      .as('marketing.fr.pricing')
  })
  .prefix('fr')

router
  .group(() => {
    router
      .get('/dashboard', async ({ inertia, auth }) => {
        // #region agent log
        try {
          const fs = await import('node:fs')
          fs.appendFileSync(
            '/Users/malolebrin/Documents/3d-website/.cursor/debug-cde605.log',
            `${JSON.stringify({
              sessionId: 'cde605',
              runId: 'pre-fix',
              hypothesisId: 'H5',
              location: 'start/routes/marketing.ts:/dashboard',
              message: 'dashboard handler entered',
              data: {},
              timestamp: Date.now(),
            })}\n`
          )
        } catch {}
        // #endregion agent log
        await auth.authenticate()
        const user = auth.getUserOrFail()
        const dashboardService = new DashboardService()
        const data = await dashboardService.getForUser(user)
        return inertia.render('dashboard', data)
      })
      .as('dashboard')
  })
  .use(middleware.auth())
