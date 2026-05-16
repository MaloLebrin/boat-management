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
                    icon: i18n.t('marketing.home.sections.security.item1_icon'),
                    title: i18n.t('marketing.home.sections.security.item1_title'),
                    description: i18n.t('marketing.home.sections.security.item1_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item2_icon'),
                    title: i18n.t('marketing.home.sections.security.item2_title'),
                    description: i18n.t('marketing.home.sections.security.item2_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item3_icon'),
                    title: i18n.t('marketing.home.sections.security.item3_title'),
                    description: i18n.t('marketing.home.sections.security.item3_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item4_icon'),
                    title: i18n.t('marketing.home.sections.security.item4_title'),
                    description: i18n.t('marketing.home.sections.security.item4_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item5_icon'),
                    title: i18n.t('marketing.home.sections.security.item5_title'),
                    description: i18n.t('marketing.home.sections.security.item5_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item6_icon'),
                    title: i18n.t('marketing.home.sections.security.item6_title'),
                    description: i18n.t('marketing.home.sections.security.item6_description'),
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
              howItWorks: {
                title: i18n.t('marketing.home.sections.how_it_works.title'),
                subtitle: i18n.t('marketing.home.sections.how_it_works.subtitle'),
                items: [
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step1_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step1_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step1_description'),
                  },
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step2_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step2_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step2_description'),
                  },
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step3_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step3_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step3_description'),
                  },
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step4_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step4_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step4_description'),
                  },
                ],
              },
              testimonials: {
                title: i18n.t('marketing.home.sections.testimonials.title'),
                items: [
                  {
                    quote: i18n.t('marketing.home.sections.testimonials.item1_quote'),
                    author: i18n.t('marketing.home.sections.testimonials.item1_author'),
                    role: i18n.t('marketing.home.sections.testimonials.item1_role'),
                  },
                  {
                    quote: i18n.t('marketing.home.sections.testimonials.item2_quote'),
                    author: i18n.t('marketing.home.sections.testimonials.item2_author'),
                    role: i18n.t('marketing.home.sections.testimonials.item2_role'),
                  },
                  {
                    quote: i18n.t('marketing.home.sections.testimonials.item3_quote'),
                    author: i18n.t('marketing.home.sections.testimonials.item3_author'),
                    role: i18n.t('marketing.home.sections.testimonials.item3_role'),
                  },
                ],
              },
              threeThings: {
                title: i18n.t('marketing.home.sections.three_things.title'),
                items: [
                  {
                    icon: i18n.t('marketing.home.sections.three_things.item1_icon'),
                    title: i18n.t('marketing.home.sections.three_things.item1_title'),
                    description: i18n.t('marketing.home.sections.three_things.item1_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.three_things.item2_icon'),
                    title: i18n.t('marketing.home.sections.three_things.item2_title'),
                    description: i18n.t('marketing.home.sections.three_things.item2_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.three_things.item3_icon'),
                    title: i18n.t('marketing.home.sections.three_things.item3_title'),
                    description: i18n.t('marketing.home.sections.three_things.item3_description'),
                  },
                ],
              },
              bentoGrid: {
                title: i18n.t('marketing.home.sections.bento_grid.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item1_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item2_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item3_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item3_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item4_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item4_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item5_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item5_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item6_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item6_description'),
                  },
                ],
              },
              pullQuote: {
                quote: i18n.t('marketing.home.sections.pull_quote.quote'),
                author: i18n.t('marketing.home.sections.pull_quote.author'),
                role: i18n.t('marketing.home.sections.pull_quote.role'),
              },
              personas: {
                title: i18n.t('marketing.home.sections.personas.title'),
                cta: i18n.t('marketing.home.sections.personas.cta'),
                items: [
                  {
                    icon: i18n.t('marketing.home.sections.personas.item1_icon'),
                    title: i18n.t('marketing.home.sections.personas.item1_title'),
                    description: i18n.t('marketing.home.sections.personas.item1_description'),
                    example: i18n.t('marketing.home.sections.personas.item1_example'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.personas.item2_icon'),
                    title: i18n.t('marketing.home.sections.personas.item2_title'),
                    description: i18n.t('marketing.home.sections.personas.item2_description'),
                    example: i18n.t('marketing.home.sections.personas.item2_example'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.personas.item3_icon'),
                    title: i18n.t('marketing.home.sections.personas.item3_title'),
                    description: i18n.t('marketing.home.sections.personas.item3_description'),
                    example: i18n.t('marketing.home.sections.personas.item3_example'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.personas.item4_icon'),
                    title: i18n.t('marketing.home.sections.personas.item4_title'),
                    description: i18n.t('marketing.home.sections.personas.item4_description'),
                    example: i18n.t('marketing.home.sections.personas.item4_example'),
                  },
                ],
              },
              comparisonTable: {
                title: i18n.t('marketing.home.sections.comparison_table.title'),
                subtitle: i18n.t('marketing.home.sections.comparison_table.subtitle'),
                cols: {
                  feature: i18n.t('marketing.home.sections.comparison_table.col_feature'),
                  excel: i18n.t('marketing.home.sections.comparison_table.col_excel'),
                  paper: i18n.t('marketing.home.sections.comparison_table.col_paper'),
                  fleetai: i18n.t('marketing.home.sections.comparison_table.col_fleetai'),
                },
                rows: [
                  i18n.t('marketing.home.sections.comparison_table.row1'),
                  i18n.t('marketing.home.sections.comparison_table.row2'),
                  i18n.t('marketing.home.sections.comparison_table.row3'),
                  i18n.t('marketing.home.sections.comparison_table.row4'),
                  i18n.t('marketing.home.sections.comparison_table.row5'),
                  i18n.t('marketing.home.sections.comparison_table.row6'),
                  i18n.t('marketing.home.sections.comparison_table.row7'),
                  i18n.t('marketing.home.sections.comparison_table.row8'),
                ],
                vals: {
                  no: i18n.t('marketing.home.sections.comparison_table.val_no'),
                  partial: i18n.t('marketing.home.sections.comparison_table.val_partial'),
                  yes: i18n.t('marketing.home.sections.comparison_table.val_yes'),
                  manual: i18n.t('marketing.home.sections.comparison_table.val_manual'),
                  auto: i18n.t('marketing.home.sections.comparison_table.val_auto'),
                  eu: i18n.t('marketing.home.sections.comparison_table.val_eu'),
                },
              },
              blog: {
                title: i18n.t('marketing.home.sections.blog.title'),
                subtitle: i18n.t('marketing.home.sections.blog.subtitle'),
                cta: i18n.t('marketing.home.sections.blog.cta'),
                articles: [
                  {
                    cat: i18n.t('marketing.home.sections.blog.article1_cat'),
                    title: i18n.t('marketing.home.sections.blog.article1_title'),
                    meta: i18n.t('marketing.home.sections.blog.article1_meta'),
                  },
                  {
                    cat: i18n.t('marketing.home.sections.blog.article2_cat'),
                    title: i18n.t('marketing.home.sections.blog.article2_title'),
                    meta: i18n.t('marketing.home.sections.blog.article2_meta'),
                  },
                  {
                    cat: i18n.t('marketing.home.sections.blog.article3_cat'),
                    title: i18n.t('marketing.home.sections.blog.article3_title'),
                    meta: i18n.t('marketing.home.sections.blog.article3_meta'),
                  },
                ],
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
                  {
                    q: i18n.t('marketing.pricing.faq.item4_q'),
                    a: i18n.t('marketing.pricing.faq.item4_a'),
                  },
                  {
                    q: i18n.t('marketing.pricing.faq.item5_q'),
                    a: i18n.t('marketing.pricing.faq.item5_a'),
                  },
                ],
              },
              cta: {
                title: i18n.t('marketing.pricing.cta.title'),
                subtitle: i18n.t('marketing.pricing.cta.subtitle'),
                primary: i18n.t('marketing.pricing.cta.primary'),
                secondary: i18n.t('marketing.pricing.cta.secondary'),
              },
              billing: {
                monthly: i18n.t('marketing.pricing.billing.monthly'),
                annual: i18n.t('marketing.pricing.billing.annual'),
                hint: i18n.t('marketing.pricing.billing.hint'),
              },
              trust: {
                noCard: i18n.t('marketing.pricing.trust.no_card'),
                cancel: i18n.t('marketing.pricing.trust.cancel'),
                euData: i18n.t('marketing.pricing.trust.eu_data'),
              },
              compareTable: {
                headers: {
                  feature: i18n.t('marketing.pricing.compare_table.header_feature'),
                  starter: i18n.t('marketing.pricing.compare_table.header_starter'),
                  pro: i18n.t('marketing.pricing.compare_table.header_pro'),
                  enterprise: i18n.t('marketing.pricing.compare_table.header_enterprise'),
                },
                rows: [
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row1_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row1_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row1_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row1_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row2_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row2_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row2_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row2_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row3_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row3_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row3_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row3_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row4_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row4_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row4_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row4_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row5_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row5_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row5_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row5_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row6_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row6_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row6_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row6_enterprise'),
                  },
                ],
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
                    icon: i18n.t('marketing.home.sections.security.item1_icon'),
                    title: i18n.t('marketing.home.sections.security.item1_title'),
                    description: i18n.t('marketing.home.sections.security.item1_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item2_icon'),
                    title: i18n.t('marketing.home.sections.security.item2_title'),
                    description: i18n.t('marketing.home.sections.security.item2_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item3_icon'),
                    title: i18n.t('marketing.home.sections.security.item3_title'),
                    description: i18n.t('marketing.home.sections.security.item3_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item4_icon'),
                    title: i18n.t('marketing.home.sections.security.item4_title'),
                    description: i18n.t('marketing.home.sections.security.item4_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item5_icon'),
                    title: i18n.t('marketing.home.sections.security.item5_title'),
                    description: i18n.t('marketing.home.sections.security.item5_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.security.item6_icon'),
                    title: i18n.t('marketing.home.sections.security.item6_title'),
                    description: i18n.t('marketing.home.sections.security.item6_description'),
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
              howItWorks: {
                title: i18n.t('marketing.home.sections.how_it_works.title'),
                subtitle: i18n.t('marketing.home.sections.how_it_works.subtitle'),
                items: [
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step1_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step1_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step1_description'),
                  },
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step2_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step2_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step2_description'),
                  },
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step3_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step3_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step3_description'),
                  },
                  {
                    step: i18n.t('marketing.home.sections.how_it_works.step4_number'),
                    title: i18n.t('marketing.home.sections.how_it_works.step4_title'),
                    description: i18n.t('marketing.home.sections.how_it_works.step4_description'),
                  },
                ],
              },
              testimonials: {
                title: i18n.t('marketing.home.sections.testimonials.title'),
                items: [
                  {
                    quote: i18n.t('marketing.home.sections.testimonials.item1_quote'),
                    author: i18n.t('marketing.home.sections.testimonials.item1_author'),
                    role: i18n.t('marketing.home.sections.testimonials.item1_role'),
                  },
                  {
                    quote: i18n.t('marketing.home.sections.testimonials.item2_quote'),
                    author: i18n.t('marketing.home.sections.testimonials.item2_author'),
                    role: i18n.t('marketing.home.sections.testimonials.item2_role'),
                  },
                  {
                    quote: i18n.t('marketing.home.sections.testimonials.item3_quote'),
                    author: i18n.t('marketing.home.sections.testimonials.item3_author'),
                    role: i18n.t('marketing.home.sections.testimonials.item3_role'),
                  },
                ],
              },
              threeThings: {
                title: i18n.t('marketing.home.sections.three_things.title'),
                items: [
                  {
                    icon: i18n.t('marketing.home.sections.three_things.item1_icon'),
                    title: i18n.t('marketing.home.sections.three_things.item1_title'),
                    description: i18n.t('marketing.home.sections.three_things.item1_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.three_things.item2_icon'),
                    title: i18n.t('marketing.home.sections.three_things.item2_title'),
                    description: i18n.t('marketing.home.sections.three_things.item2_description'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.three_things.item3_icon'),
                    title: i18n.t('marketing.home.sections.three_things.item3_title'),
                    description: i18n.t('marketing.home.sections.three_things.item3_description'),
                  },
                ],
              },
              bentoGrid: {
                title: i18n.t('marketing.home.sections.bento_grid.title'),
                items: [
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item1_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item1_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item2_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item2_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item3_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item3_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item4_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item4_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item5_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item5_description'),
                  },
                  {
                    title: i18n.t('marketing.home.sections.bento_grid.item6_title'),
                    description: i18n.t('marketing.home.sections.bento_grid.item6_description'),
                  },
                ],
              },
              pullQuote: {
                quote: i18n.t('marketing.home.sections.pull_quote.quote'),
                author: i18n.t('marketing.home.sections.pull_quote.author'),
                role: i18n.t('marketing.home.sections.pull_quote.role'),
              },
              personas: {
                title: i18n.t('marketing.home.sections.personas.title'),
                cta: i18n.t('marketing.home.sections.personas.cta'),
                items: [
                  {
                    icon: i18n.t('marketing.home.sections.personas.item1_icon'),
                    title: i18n.t('marketing.home.sections.personas.item1_title'),
                    description: i18n.t('marketing.home.sections.personas.item1_description'),
                    example: i18n.t('marketing.home.sections.personas.item1_example'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.personas.item2_icon'),
                    title: i18n.t('marketing.home.sections.personas.item2_title'),
                    description: i18n.t('marketing.home.sections.personas.item2_description'),
                    example: i18n.t('marketing.home.sections.personas.item2_example'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.personas.item3_icon'),
                    title: i18n.t('marketing.home.sections.personas.item3_title'),
                    description: i18n.t('marketing.home.sections.personas.item3_description'),
                    example: i18n.t('marketing.home.sections.personas.item3_example'),
                  },
                  {
                    icon: i18n.t('marketing.home.sections.personas.item4_icon'),
                    title: i18n.t('marketing.home.sections.personas.item4_title'),
                    description: i18n.t('marketing.home.sections.personas.item4_description'),
                    example: i18n.t('marketing.home.sections.personas.item4_example'),
                  },
                ],
              },
              comparisonTable: {
                title: i18n.t('marketing.home.sections.comparison_table.title'),
                subtitle: i18n.t('marketing.home.sections.comparison_table.subtitle'),
                cols: {
                  feature: i18n.t('marketing.home.sections.comparison_table.col_feature'),
                  excel: i18n.t('marketing.home.sections.comparison_table.col_excel'),
                  paper: i18n.t('marketing.home.sections.comparison_table.col_paper'),
                  fleetai: i18n.t('marketing.home.sections.comparison_table.col_fleetai'),
                },
                rows: [
                  i18n.t('marketing.home.sections.comparison_table.row1'),
                  i18n.t('marketing.home.sections.comparison_table.row2'),
                  i18n.t('marketing.home.sections.comparison_table.row3'),
                  i18n.t('marketing.home.sections.comparison_table.row4'),
                  i18n.t('marketing.home.sections.comparison_table.row5'),
                  i18n.t('marketing.home.sections.comparison_table.row6'),
                  i18n.t('marketing.home.sections.comparison_table.row7'),
                  i18n.t('marketing.home.sections.comparison_table.row8'),
                ],
                vals: {
                  no: i18n.t('marketing.home.sections.comparison_table.val_no'),
                  partial: i18n.t('marketing.home.sections.comparison_table.val_partial'),
                  yes: i18n.t('marketing.home.sections.comparison_table.val_yes'),
                  manual: i18n.t('marketing.home.sections.comparison_table.val_manual'),
                  auto: i18n.t('marketing.home.sections.comparison_table.val_auto'),
                  eu: i18n.t('marketing.home.sections.comparison_table.val_eu'),
                },
              },
              blog: {
                title: i18n.t('marketing.home.sections.blog.title'),
                subtitle: i18n.t('marketing.home.sections.blog.subtitle'),
                cta: i18n.t('marketing.home.sections.blog.cta'),
                articles: [
                  {
                    cat: i18n.t('marketing.home.sections.blog.article1_cat'),
                    title: i18n.t('marketing.home.sections.blog.article1_title'),
                    meta: i18n.t('marketing.home.sections.blog.article1_meta'),
                  },
                  {
                    cat: i18n.t('marketing.home.sections.blog.article2_cat'),
                    title: i18n.t('marketing.home.sections.blog.article2_title'),
                    meta: i18n.t('marketing.home.sections.blog.article2_meta'),
                  },
                  {
                    cat: i18n.t('marketing.home.sections.blog.article3_cat'),
                    title: i18n.t('marketing.home.sections.blog.article3_title'),
                    meta: i18n.t('marketing.home.sections.blog.article3_meta'),
                  },
                ],
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
                  {
                    q: i18n.t('marketing.pricing.faq.item4_q'),
                    a: i18n.t('marketing.pricing.faq.item4_a'),
                  },
                  {
                    q: i18n.t('marketing.pricing.faq.item5_q'),
                    a: i18n.t('marketing.pricing.faq.item5_a'),
                  },
                ],
              },
              cta: {
                title: i18n.t('marketing.pricing.cta.title'),
                subtitle: i18n.t('marketing.pricing.cta.subtitle'),
                primary: i18n.t('marketing.pricing.cta.primary'),
                secondary: i18n.t('marketing.pricing.cta.secondary'),
              },
              billing: {
                monthly: i18n.t('marketing.pricing.billing.monthly'),
                annual: i18n.t('marketing.pricing.billing.annual'),
                hint: i18n.t('marketing.pricing.billing.hint'),
              },
              trust: {
                noCard: i18n.t('marketing.pricing.trust.no_card'),
                cancel: i18n.t('marketing.pricing.trust.cancel'),
                euData: i18n.t('marketing.pricing.trust.eu_data'),
              },
              compareTable: {
                headers: {
                  feature: i18n.t('marketing.pricing.compare_table.header_feature'),
                  starter: i18n.t('marketing.pricing.compare_table.header_starter'),
                  pro: i18n.t('marketing.pricing.compare_table.header_pro'),
                  enterprise: i18n.t('marketing.pricing.compare_table.header_enterprise'),
                },
                rows: [
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row1_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row1_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row1_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row1_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row2_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row2_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row2_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row2_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row3_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row3_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row3_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row3_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row4_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row4_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row4_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row4_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row5_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row5_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row5_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row5_enterprise'),
                  },
                  {
                    feature: i18n.t('marketing.pricing.compare_table.row6_feature'),
                    starter: i18n.t('marketing.pricing.compare_table.row6_starter'),
                    pro: i18n.t('marketing.pricing.compare_table.row6_pro'),
                    enterprise: i18n.t('marketing.pricing.compare_table.row6_enterprise'),
                  },
                ],
              },
            },
          },
        })
      })
      .as('marketing.fr.pricing')
  })
  .prefix('fr')

// About EN
router
  .get('/en/about', ({ inertia, i18n }) => {
    return inertia.render('marketing/about', {
      t: {
        meta: {
          title: i18n.t('marketing.about.meta_title'),
          description: i18n.t('marketing.about.meta_description'),
        },
        about: {
          hero: {
            eyebrow: i18n.t('marketing.about.hero_eyebrow'),
            title: i18n.t('marketing.about.hero_title'),
            subtitle: i18n.t('marketing.about.hero_subtitle'),
          },
          story: {
            title: i18n.t('marketing.about.story_title'),
            p1: i18n.t('marketing.about.story_p1'),
            p2: i18n.t('marketing.about.story_p2'),
          },
          values: {
            title: i18n.t('marketing.about.values_title'),
            items: [
              {
                icon: i18n.t('marketing.about.value1_icon'),
                title: i18n.t('marketing.about.value1_title'),
                description: i18n.t('marketing.about.value1_description'),
              },
              {
                icon: i18n.t('marketing.about.value2_icon'),
                title: i18n.t('marketing.about.value2_title'),
                description: i18n.t('marketing.about.value2_description'),
              },
              {
                icon: i18n.t('marketing.about.value3_icon'),
                title: i18n.t('marketing.about.value3_title'),
                description: i18n.t('marketing.about.value3_description'),
              },
            ],
          },
          team: {
            title: i18n.t('marketing.about.team_title'),
            members: [
              { name: 'Anais M.', role: 'Co-fondatrice · CEO', bio: 'skipper depuis 12 ans' },
              { name: 'Theo R.', role: 'Co-fondateur · CTO', bio: 'ex-Doctolib, voileux' },
              { name: 'Sophie B.', role: 'Designer', bio: 'amoureuse des marinas' },
              { name: 'Lucas P.', role: 'Ingenieur', bio: 'ex-Datadog' },
              { name: 'Marc D.', role: 'Customer success', bio: 'ancien chef de chantier' },
            ],
          },
          stats: [
            {
              value: i18n.t('marketing.about.stats_fleets'),
              label: i18n.t('marketing.about.stats_fleets_label'),
            },
            {
              value: i18n.t('marketing.about.stats_boats'),
              label: i18n.t('marketing.about.stats_boats_label'),
            },
            {
              value: i18n.t('marketing.about.stats_events'),
              label: i18n.t('marketing.about.stats_events_label'),
            },
            {
              value: i18n.t('marketing.about.stats_founded'),
              label: i18n.t('marketing.about.stats_founded_label'),
            },
          ],
          cta: {
            title: i18n.t('marketing.about.cta_title'),
            subtitle: i18n.t('marketing.about.cta_subtitle'),
            button: i18n.t('marketing.about.cta_button'),
          },
        },
      },
    })
  })
  .as('marketing.en.about')

// About FR
router
  .get('/fr/a-propos', ({ inertia, i18n }) => {
    return inertia.render('marketing/about', {
      t: {
        meta: {
          title: i18n.t('marketing.about.meta_title'),
          description: i18n.t('marketing.about.meta_description'),
        },
        about: {
          hero: {
            eyebrow: i18n.t('marketing.about.hero_eyebrow'),
            title: i18n.t('marketing.about.hero_title'),
            subtitle: i18n.t('marketing.about.hero_subtitle'),
          },
          story: {
            title: i18n.t('marketing.about.story_title'),
            p1: i18n.t('marketing.about.story_p1'),
            p2: i18n.t('marketing.about.story_p2'),
          },
          values: {
            title: i18n.t('marketing.about.values_title'),
            items: [
              {
                icon: i18n.t('marketing.about.value1_icon'),
                title: i18n.t('marketing.about.value1_title'),
                description: i18n.t('marketing.about.value1_description'),
              },
              {
                icon: i18n.t('marketing.about.value2_icon'),
                title: i18n.t('marketing.about.value2_title'),
                description: i18n.t('marketing.about.value2_description'),
              },
              {
                icon: i18n.t('marketing.about.value3_icon'),
                title: i18n.t('marketing.about.value3_title'),
                description: i18n.t('marketing.about.value3_description'),
              },
            ],
          },
          team: {
            title: i18n.t('marketing.about.team_title'),
            members: [
              { name: 'Anais M.', role: 'Co-fondatrice · CEO', bio: 'skipper depuis 12 ans' },
              { name: 'Theo R.', role: 'Co-fondateur · CTO', bio: 'ex-Doctolib, voileux' },
              { name: 'Sophie B.', role: 'Designer', bio: 'amoureuse des marinas' },
              { name: 'Lucas P.', role: 'Ingenieur', bio: 'ex-Datadog' },
              { name: 'Marc D.', role: 'Customer success', bio: 'ancien chef de chantier' },
            ],
          },
          stats: [
            {
              value: i18n.t('marketing.about.stats_fleets'),
              label: i18n.t('marketing.about.stats_fleets_label'),
            },
            {
              value: i18n.t('marketing.about.stats_boats'),
              label: i18n.t('marketing.about.stats_boats_label'),
            },
            {
              value: i18n.t('marketing.about.stats_events'),
              label: i18n.t('marketing.about.stats_events_label'),
            },
            {
              value: i18n.t('marketing.about.stats_founded'),
              label: i18n.t('marketing.about.stats_founded_label'),
            },
          ],
          cta: {
            title: i18n.t('marketing.about.cta_title'),
            subtitle: i18n.t('marketing.about.cta_subtitle'),
            button: i18n.t('marketing.about.cta_button'),
          },
        },
      },
    })
  })
  .as('marketing.fr.about')

// Contact (language-neutral)
router
  .get('/contact', ({ inertia, i18n }) => {
    return inertia.render('marketing/contact', {
      t: {
        meta: {
          title: i18n.t('marketing.contact.meta_title'),
          description: i18n.t('marketing.contact.meta_description'),
        },
        contact: {
          hero: {
            title: i18n.t('marketing.contact.hero_title'),
            subtitle: i18n.t('marketing.contact.hero_subtitle'),
          },
          form: {
            firstName: i18n.t('marketing.contact.form_first_name'),
            lastName: i18n.t('marketing.contact.form_last_name'),
            email: i18n.t('marketing.contact.form_email'),
            organization: i18n.t('marketing.contact.form_organization'),
            fleetSize: i18n.t('marketing.contact.form_fleet_size'),
            subject: i18n.t('marketing.contact.form_subject'),
            subjects: [
              i18n.t('marketing.contact.form_subject_demo'),
              i18n.t('marketing.contact.form_subject_pricing'),
              i18n.t('marketing.contact.form_subject_migration'),
              i18n.t('marketing.contact.form_subject_technical'),
              i18n.t('marketing.contact.form_subject_other'),
            ],
            message: i18n.t('marketing.contact.form_message'),
            messagePlaceholder: i18n.t('marketing.contact.form_message_placeholder'),
            submit: i18n.t('marketing.contact.form_submit'),
          },
          info: {
            phone: {
              label: i18n.t('marketing.contact.contact_phone'),
              number: i18n.t('marketing.contact.contact_phone_number'),
              hours: i18n.t('marketing.contact.contact_phone_hours'),
            },
            email: {
              label: i18n.t('marketing.contact.contact_email_label'),
              value: i18n.t('marketing.contact.contact_email'),
            },
            address: {
              label: i18n.t('marketing.contact.contact_address_label'),
              value: i18n.t('marketing.contact.contact_address'),
            },
            cta: {
              title: i18n.t('marketing.contact.contact_cta_title'),
              text: i18n.t('marketing.contact.contact_cta_text'),
              button: i18n.t('marketing.contact.contact_cta_button'),
            },
          },
        },
      },
    })
  })
  .as('marketing.contact')

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
