import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PLAN_PRICES } from '../../shared/types/plan.js'

@inject()
export default class MarketingController {
  async home({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/home', {
      t: this.buildHomePageData(i18n),
    })
  }

  async pricing({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/pricing', {
      t: this.buildPricingPageData(i18n),
    })
  }

  async about({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/about', {
      t: this.buildAboutPageData(i18n),
    })
  }

  async contact({ inertia, i18n }: HttpContext) {
    return inertia.render('marketing/contact', {
      t: this.buildContactPageData(i18n),
    })
  }

  private buildHomePageData(i18n: { t: (key: string) => string }) {
    return {
      brand: {
        name: i18n.t('marketing.brand.name'),
        tagline: i18n.t('marketing.brand.tagline'),
      },
      meta: {
        title: `${i18n.t('marketing.brand.name')} - ${i18n.t('marketing.home.hero.loueurs_title')}`,
        description: i18n.t('marketing.home.hero.loueurs_subtitle'),
      },
      home: {
        hero: {
          cta: {
            primary: i18n.t('marketing.home.hero.cta_primary'),
            secondary: i18n.t('marketing.home.hero.cta_secondary'),
          },
          caption: i18n.t('marketing.home.hero.caption'),
          content: {
            loueurs: {
              title: i18n.t('marketing.home.hero.loueurs_title'),
              titleHighlight: i18n.t('marketing.home.hero.loueurs_highlight'),
              subtitle: i18n.t('marketing.home.hero.loueurs_subtitle'),
            },
            ecoles: {
              title: i18n.t('marketing.home.hero.ecoles_title'),
              titleHighlight: i18n.t('marketing.home.hero.ecoles_highlight'),
              subtitle: i18n.t('marketing.home.hero.ecoles_subtitle'),
            },
            marinas: {
              title: i18n.t('marketing.home.hero.marinas_title'),
              titleHighlight: i18n.t('marketing.home.hero.marinas_highlight'),
              subtitle: i18n.t('marketing.home.hero.marinas_subtitle'),
            },
          },
        },
        socialProof: {
          eyebrow: i18n.t('marketing.home.social_proof.eyebrow'),
          logos: [
            i18n.t('marketing.home.social_proof.logo1'),
            i18n.t('marketing.home.social_proof.logo2'),
            i18n.t('marketing.home.social_proof.logo3'),
            i18n.t('marketing.home.social_proof.logo4'),
            i18n.t('marketing.home.social_proof.logo5'),
            i18n.t('marketing.home.social_proof.logo6'),
            i18n.t('marketing.home.social_proof.logo7'),
            i18n.t('marketing.home.social_proof.logo8'),
          ],
        },
        problem: {
          title: i18n.t('marketing.home.problem.title'),
          titleHighlight: i18n.t('marketing.home.problem.title_highlight'),
          items: [
            {
              number: i18n.t('marketing.home.problem.item1_number'),
              label: i18n.t('marketing.home.problem.item1_label'),
              title: i18n.t('marketing.home.problem.item1_title'),
              stat: i18n.t('marketing.home.problem.item1_stat'),
              statSub: i18n.t('marketing.home.problem.item1_stat_sub'),
              body: i18n.t('marketing.home.problem.item1_body'),
            },
            {
              number: i18n.t('marketing.home.problem.item2_number'),
              label: i18n.t('marketing.home.problem.item2_label'),
              title: i18n.t('marketing.home.problem.item2_title'),
              stat: i18n.t('marketing.home.problem.item2_stat'),
              statSub: i18n.t('marketing.home.problem.item2_stat_sub'),
              body: i18n.t('marketing.home.problem.item2_body'),
            },
            {
              number: i18n.t('marketing.home.problem.item3_number'),
              label: i18n.t('marketing.home.problem.item3_label'),
              title: i18n.t('marketing.home.problem.item3_title'),
              stat: i18n.t('marketing.home.problem.item3_stat'),
              statSub: i18n.t('marketing.home.problem.item3_stat_sub'),
              body: i18n.t('marketing.home.problem.item3_body'),
            },
          ],
        },
        pillars: {
          title: i18n.t('marketing.home.pillars.title'),
          titleHighlight: i18n.t('marketing.home.pillars.title_highlight'),
          items: [
            {
              number: i18n.t('marketing.home.pillars.item1_number'),
              title: i18n.t('marketing.home.pillars.item1_title'),
              description: i18n.t('marketing.home.pillars.item1_description'),
            },
            {
              number: i18n.t('marketing.home.pillars.item2_number'),
              title: i18n.t('marketing.home.pillars.item2_title'),
              description: i18n.t('marketing.home.pillars.item2_description'),
            },
            {
              number: i18n.t('marketing.home.pillars.item3_number'),
              title: i18n.t('marketing.home.pillars.item3_title'),
              description: i18n.t('marketing.home.pillars.item3_description'),
              isAi: true,
            },
          ],
        },
        features: [
          {
            eyebrow: i18n.t('marketing.home.features.item1_eyebrow'),
            title: i18n.t('marketing.home.features.item1_title'),
            titleHighlight: i18n.t('marketing.home.features.item1_highlight'),
            body: i18n.t('marketing.home.features.item1_body'),
            bullets: [
              i18n.t('marketing.home.features.item1_bullet1'),
              i18n.t('marketing.home.features.item1_bullet2'),
              i18n.t('marketing.home.features.item1_bullet3'),
              i18n.t('marketing.home.features.item1_bullet4'),
            ],
          },
          {
            eyebrow: i18n.t('marketing.home.features.item2_eyebrow'),
            title: i18n.t('marketing.home.features.item2_title'),
            titleHighlight: i18n.t('marketing.home.features.item2_highlight'),
            body: i18n.t('marketing.home.features.item2_body'),
            bullets: [
              i18n.t('marketing.home.features.item2_bullet1'),
              i18n.t('marketing.home.features.item2_bullet2'),
              i18n.t('marketing.home.features.item2_bullet3'),
              i18n.t('marketing.home.features.item2_bullet4'),
            ],
          },
          {
            eyebrow: i18n.t('marketing.home.features.item3_eyebrow'),
            title: i18n.t('marketing.home.features.item3_title'),
            titleHighlight: i18n.t('marketing.home.features.item3_highlight'),
            body: i18n.t('marketing.home.features.item3_body'),
            bullets: [
              i18n.t('marketing.home.features.item3_bullet1'),
              i18n.t('marketing.home.features.item3_bullet2'),
              i18n.t('marketing.home.features.item3_bullet3'),
              i18n.t('marketing.home.features.item3_bullet4'),
            ],
          },
        ],
        personas: {
          title: i18n.t('marketing.home.personas.title'),
          subtitle: i18n.t('marketing.home.personas.subtitle'),
          ctaLabel: i18n.t('marketing.home.personas.cta_label'),
          items: [
            {
              key: 'loueurs' as const,
              icon: '⛵',
              tabLabel: i18n.t('marketing.home.personas.item1_tab'),
              title: i18n.t('marketing.home.personas.item1_title'),
              subtitle: i18n.t('marketing.home.personas.item1_subtitle'),
              bullets: [
                i18n.t('marketing.home.personas.item1_bullet1'),
                i18n.t('marketing.home.personas.item1_bullet2'),
                i18n.t('marketing.home.personas.item1_bullet3'),
              ],
              quote: {
                text: i18n.t('marketing.home.personas.item1_quote'),
                author: i18n.t('marketing.home.personas.item1_quote_author'),
                role: i18n.t('marketing.home.personas.item1_quote_role'),
              },
              stat: {
                value: i18n.t('marketing.home.personas.item1_stat_value'),
                label: i18n.t('marketing.home.personas.item1_stat_label'),
              },
            },
            {
              key: 'ecoles' as const,
              icon: '🎓',
              tabLabel: i18n.t('marketing.home.personas.item2_tab'),
              title: i18n.t('marketing.home.personas.item2_title'),
              subtitle: i18n.t('marketing.home.personas.item2_subtitle'),
              bullets: [
                i18n.t('marketing.home.personas.item2_bullet1'),
                i18n.t('marketing.home.personas.item2_bullet2'),
                i18n.t('marketing.home.personas.item2_bullet3'),
              ],
              quote: {
                text: i18n.t('marketing.home.personas.item2_quote'),
                author: i18n.t('marketing.home.personas.item2_quote_author'),
                role: i18n.t('marketing.home.personas.item2_quote_role'),
              },
              stat: {
                value: i18n.t('marketing.home.personas.item2_stat_value'),
                label: i18n.t('marketing.home.personas.item2_stat_label'),
              },
            },
            {
              key: 'marinas' as const,
              icon: '🏗',
              tabLabel: i18n.t('marketing.home.personas.item3_tab'),
              title: i18n.t('marketing.home.personas.item3_title'),
              subtitle: i18n.t('marketing.home.personas.item3_subtitle'),
              bullets: [
                i18n.t('marketing.home.personas.item3_bullet1'),
                i18n.t('marketing.home.personas.item3_bullet2'),
                i18n.t('marketing.home.personas.item3_bullet3'),
              ],
              quote: {
                text: i18n.t('marketing.home.personas.item3_quote'),
                author: i18n.t('marketing.home.personas.item3_quote_author'),
                role: i18n.t('marketing.home.personas.item3_quote_role'),
              },
              stat: {
                value: i18n.t('marketing.home.personas.item3_stat_value'),
                label: i18n.t('marketing.home.personas.item3_stat_label'),
              },
            },
            {
              key: 'armateurs' as const,
              icon: '⚓',
              tabLabel: i18n.t('marketing.home.personas.item4_tab'),
              title: i18n.t('marketing.home.personas.item4_title'),
              subtitle: i18n.t('marketing.home.personas.item4_subtitle'),
              bullets: [
                i18n.t('marketing.home.personas.item4_bullet1'),
                i18n.t('marketing.home.personas.item4_bullet2'),
                i18n.t('marketing.home.personas.item4_bullet3'),
              ],
              quote: {
                text: i18n.t('marketing.home.personas.item4_quote'),
                author: i18n.t('marketing.home.personas.item4_quote_author'),
                role: i18n.t('marketing.home.personas.item4_quote_role'),
              },
              stat: {
                value: i18n.t('marketing.home.personas.item4_stat_value'),
                label: i18n.t('marketing.home.personas.item4_stat_label'),
              },
            },
          ],
        },
        statsBand: [
          {
            value: i18n.t('marketing.home.stats_band.item1_value'),
            label: i18n.t('marketing.home.stats_band.item1_label'),
          },
          {
            value: i18n.t('marketing.home.stats_band.item2_value'),
            label: i18n.t('marketing.home.stats_band.item2_label'),
          },
          {
            value: i18n.t('marketing.home.stats_band.item3_value'),
            label: i18n.t('marketing.home.stats_band.item3_label'),
          },
          {
            value: i18n.t('marketing.home.stats_band.item4_value'),
            label: i18n.t('marketing.home.stats_band.item4_label'),
          },
        ],
        comparison: {
          title: i18n.t('marketing.home.comparison.title'),
          subtitle: i18n.t('marketing.home.comparison.subtitle'),
          cols: {
            feature: i18n.t('marketing.home.comparison.col_feature'),
            excel: i18n.t('marketing.home.comparison.col_excel'),
            paper: i18n.t('marketing.home.comparison.col_paper'),
            fleetai: i18n.t('marketing.home.comparison.col_fleetai'),
          },
          rows: [
            {
              feature: i18n.t('marketing.home.comparison.row1_feature'),
              excel: i18n.t('marketing.home.comparison.row1_excel'),
              paper: i18n.t('marketing.home.comparison.row1_paper'),
              fleetai: i18n.t('marketing.home.comparison.row1_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row2_feature'),
              excel: i18n.t('marketing.home.comparison.row2_excel'),
              paper: i18n.t('marketing.home.comparison.row2_paper'),
              fleetai: i18n.t('marketing.home.comparison.row2_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row3_feature'),
              excel: i18n.t('marketing.home.comparison.row3_excel'),
              paper: i18n.t('marketing.home.comparison.row3_paper'),
              fleetai: i18n.t('marketing.home.comparison.row3_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row4_feature'),
              excel: i18n.t('marketing.home.comparison.row4_excel'),
              paper: i18n.t('marketing.home.comparison.row4_paper'),
              fleetai: i18n.t('marketing.home.comparison.row4_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row5_feature'),
              excel: i18n.t('marketing.home.comparison.row5_excel'),
              paper: i18n.t('marketing.home.comparison.row5_paper'),
              fleetai: i18n.t('marketing.home.comparison.row5_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row6_feature'),
              excel: i18n.t('marketing.home.comparison.row6_excel'),
              paper: i18n.t('marketing.home.comparison.row6_paper'),
              fleetai: i18n.t('marketing.home.comparison.row6_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row7_feature'),
              excel: i18n.t('marketing.home.comparison.row7_excel'),
              paper: i18n.t('marketing.home.comparison.row7_paper'),
              fleetai: i18n.t('marketing.home.comparison.row7_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row8_feature'),
              excel: i18n.t('marketing.home.comparison.row8_excel'),
              paper: i18n.t('marketing.home.comparison.row8_paper'),
              fleetai: i18n.t('marketing.home.comparison.row8_fleetai'),
            },
            {
              feature: i18n.t('marketing.home.comparison.row9_feature'),
              excel: i18n.t('marketing.home.comparison.row9_excel'),
              paper: i18n.t('marketing.home.comparison.row9_paper'),
              fleetai: i18n.t('marketing.home.comparison.row9_fleetai'),
            },
          ],
        },
        testimonials: {
          title: i18n.t('marketing.home.testimonials.title'),
          items: [
            {
              quote: i18n.t('marketing.home.testimonials.item1_quote'),
              author: i18n.t('marketing.home.testimonials.item1_author'),
              role: i18n.t('marketing.home.testimonials.item1_role'),
              featured: true,
            },
            {
              quote: i18n.t('marketing.home.testimonials.item2_quote'),
              author: i18n.t('marketing.home.testimonials.item2_author'),
              role: i18n.t('marketing.home.testimonials.item2_role'),
            },
            {
              quote: i18n.t('marketing.home.testimonials.item3_quote'),
              author: i18n.t('marketing.home.testimonials.item3_author'),
              role: i18n.t('marketing.home.testimonials.item3_role'),
            },
            {
              quote: i18n.t('marketing.home.testimonials.item4_quote'),
              author: i18n.t('marketing.home.testimonials.item4_author'),
              role: i18n.t('marketing.home.testimonials.item4_role'),
            },
          ],
        },
        security: {
          title: i18n.t('marketing.home.security.title'),
          subtitle: i18n.t('marketing.home.security.subtitle'),
          items: [
            {
              icon: '🇪🇺',
              title: i18n.t('marketing.home.security.item1_title'),
              description: i18n.t('marketing.home.security.item1_description'),
            },
            {
              icon: '🔒',
              title: i18n.t('marketing.home.security.item2_title'),
              description: i18n.t('marketing.home.security.item2_description'),
            },
            {
              icon: '📋',
              title: i18n.t('marketing.home.security.item3_title'),
              description: i18n.t('marketing.home.security.item3_description'),
            },
            {
              icon: '🛡',
              title: i18n.t('marketing.home.security.item4_title'),
              description: i18n.t('marketing.home.security.item4_description'),
            },
            {
              icon: '💾',
              title: i18n.t('marketing.home.security.item5_title'),
              description: i18n.t('marketing.home.security.item5_description'),
            },
            {
              icon: '🔐',
              title: i18n.t('marketing.home.security.item6_title'),
              description: i18n.t('marketing.home.security.item6_description'),
            },
          ],
        },
        faq: {
          title: i18n.t('marketing.home.faq.title'),
          subtitle: i18n.t('marketing.home.faq.subtitle'),
          cta: {
            label: i18n.t('marketing.home.faq.cta_label'),
            href: i18n.t('marketing.home.faq.cta_href'),
          },
          items: [
            { q: i18n.t('marketing.home.faq.item1_q'), a: i18n.t('marketing.home.faq.item1_a') },
            { q: i18n.t('marketing.home.faq.item2_q'), a: i18n.t('marketing.home.faq.item2_a') },
            { q: i18n.t('marketing.home.faq.item3_q'), a: i18n.t('marketing.home.faq.item3_a') },
            { q: i18n.t('marketing.home.faq.item4_q'), a: i18n.t('marketing.home.faq.item4_a') },
            { q: i18n.t('marketing.home.faq.item5_q'), a: i18n.t('marketing.home.faq.item5_a') },
            { q: i18n.t('marketing.home.faq.item6_q'), a: i18n.t('marketing.home.faq.item6_a') },
            { q: i18n.t('marketing.home.faq.item7_q'), a: i18n.t('marketing.home.faq.item7_a') },
            { q: i18n.t('marketing.home.faq.item8_q'), a: i18n.t('marketing.home.faq.item8_a') },
          ],
        },
        finalCta: {
          title: i18n.t('marketing.home.final_cta.title'),
          titleHighlight: i18n.t('marketing.home.final_cta.title_highlight'),
          subtitle: i18n.t('marketing.home.final_cta.subtitle'),
          primaryCta: i18n.t('marketing.home.final_cta.primary_cta'),
          secondaryCta: i18n.t('marketing.home.final_cta.secondary_cta'),
        },
      },
    }
  }

  private buildPricingPageData(i18n: { t: (key: string) => string }) {
    const t = (key: string) => i18n.t(`marketing.pricing2.${key}`)

    return {
      meta: {
        title: t('meta_title'),
        description: t('meta_description'),
      },
      pricing: {
        hero: {
          eyebrowLabel: t('hero_eyebrow'),
          title: t('hero_title'),
          titleHighlight: t('hero_title_highlight'),
          subtitle: t('hero_subtitle'),
          monthlyLabel: t('billing_monthly'),
          annualLabel: t('billing_annual'),
          annualBadge: t('billing_annual_badge'),
        },
        tiers: [
          {
            name: t('tier_starter_name'),
            tag: t('tier_starter_tag'),
            price: PLAN_PRICES.starter.monthly,
            pricePer: t('tier_price_per'),
            sub: t('tier_starter_sub'),
            feats: [
              [t('tier_starter_feat1')],
              [t('tier_starter_feat2')],
              [t('tier_starter_feat3'), t('tier_starter_feat3_sub')],
              [t('tier_starter_feat4')],
              [t('tier_starter_feat5')],
              [t('tier_starter_feat6'), t('tier_starter_feat6_sub')],
            ] as Array<[string, string?]>,
            cta: t('tier_starter_cta'),
            ctaVariant: 'outline',
          },
          {
            name: t('tier_pro_name'),
            tag: t('tier_pro_tag'),
            price: PLAN_PRICES.pro.monthly,
            pricePer: t('tier_price_per'),
            priceAnnual: PLAN_PRICES.pro.annualMonthly,
            priceAnnualPer: t('tier_price_per'),
            sub: t('tier_pro_sub'),
            featured: true,
            feats: [
              [t('tier_pro_feat1')],
              [t('tier_pro_feat2'), t('tier_pro_feat2_sub')],
              [t('tier_pro_feat3'), t('tier_pro_feat3_sub')],
              [t('tier_pro_feat4')],
              [t('tier_pro_feat5'), t('tier_pro_feat5_sub')],
              [t('tier_pro_feat6')],
              [t('tier_pro_feat7')],
              [t('tier_pro_feat8')],
              [t('tier_pro_feat9'), t('tier_pro_feat9_sub')],
            ] as Array<[string, string?]>,
            cta: t('tier_pro_cta'),
            ctaVariant: 'primary',
          },
          {
            name: t('tier_enterprise_name'),
            tag: t('tier_enterprise_tag'),
            price: PLAN_PRICES.enterprise.monthly,
            pricePer: t('tier_price_per'),
            priceAnnual: PLAN_PRICES.enterprise.annualMonthly,
            priceAnnualPer: t('tier_price_per'),
            sub: t('tier_enterprise_sub'),
            feats: [
              [t('tier_enterprise_feat1')],
              [t('tier_enterprise_feat2')],
              [t('tier_enterprise_feat3'), t('tier_enterprise_feat3_sub')],
              [t('tier_enterprise_feat4')],
              [t('tier_enterprise_feat5'), t('tier_enterprise_feat5_sub')],
              [t('tier_enterprise_feat6'), t('tier_enterprise_feat6_sub')],
              [t('tier_enterprise_feat7')],
              [t('tier_enterprise_feat8')],
              [t('tier_enterprise_feat9')],
            ] as Array<[string, string?]>,
            cta: t('tier_enterprise_cta'),
            ctaVariant: 'secondary',
          },
        ],
        reassurance: [
          { icon: '✓', label: t('reassurance_1') },
          { icon: '✓', label: t('reassurance_2') },
          { icon: '✓', label: t('reassurance_3') },
          { icon: '✓', label: t('reassurance_4') },
          { icon: '✓', label: t('reassurance_5') },
        ],
        roi: {
          eyebrow: t('roi_eyebrow'),
          title: t('roi_title'),
          titleHighlight: t('roi_title_highlight'),
          subtitle: t('roi_subtitle'),
          profileLabel: t('roi_profile_label'),
          boatsLabel: t('roi_boats_label'),
          hourlyLabel: t('roi_hourly_label'),
          studyNote: t('roi_study_note'),
          savingsLabel: t('roi_savings_label'),
          perMonthLabel: t('roi_per_month'),
          timeLabel: t('roi_time_label'),
          maintLabel: t('roi_maint_label'),
          fleetideLabel: t('roi_fleetide_label'),
          fleetCostLabel: t('roi_fleet_cost_label'),
          roiLabel: t('roi_roi_label'),
          ctaLabel: t('roi_cta'),
          profiles: {
            loueurs: { label: t('roi_profile_loueurs'), emoji: '⛵' },
            ecoles: { label: t('roi_profile_ecoles'), emoji: '🎓' },
            marinas: { label: t('roi_profile_marinas'), emoji: '🏗' },
            armateurs: { label: t('roi_profile_armateurs'), emoji: '⚓' },
          },
        },
        testimonials: {
          eyebrow: t('testi_eyebrow'),
          title: t('testi_title'),
          titleHighlight: t('testi_title_highlight'),
          items: [
            {
              stat: t('testi_1_stat'),
              statLabel: t('testi_1_stat_label'),
              quote: t('testi_1_quote'),
              name: t('testi_1_name'),
              org: t('testi_1_org'),
              role: t('testi_1_role'),
              plan: t('testi_1_plan'),
            },
            {
              stat: t('testi_2_stat'),
              statLabel: t('testi_2_stat_label'),
              quote: t('testi_2_quote'),
              name: t('testi_2_name'),
              org: t('testi_2_org'),
              role: t('testi_2_role'),
              plan: t('testi_2_plan'),
            },
            {
              stat: t('testi_3_stat'),
              statLabel: t('testi_3_stat_label'),
              quote: t('testi_3_quote'),
              name: t('testi_3_name'),
              org: t('testi_3_org'),
              role: t('testi_3_role'),
              plan: t('testi_3_plan'),
            },
          ],
        },
        detailedTable: {
          eyebrow: t('table_eyebrow'),
          title: t('table_title'),
          titleHighlight: t('table_title_highlight'),
          subtitle: t('table_subtitle'),
          expandAll: t('table_expand_all'),
          collapseAll: t('table_collapse_all'),
          planHeaders: [
            { name: t('table_plan_starter'), price: t('table_plan_starter_price'), cta: t('table_plan_starter_cta') },
            { name: t('table_plan_pro'), price: t('table_plan_pro_price'), cta: t('table_plan_pro_cta') },
            { name: t('table_plan_enterprise'), price: t('table_plan_enterprise_price'), cta: t('table_plan_enterprise_cta') },
          ],
          groups: [
            {
              title: t('table_g1'),
              rows: [
                [t('table_g1_r1'), t('table_g1_r1_s'), t('table_g1_r1_p'), t('table_g1_r1_e')],
                [t('table_g1_r2'), t('table_g1_r2_s'), t('table_g1_r2_p'), t('table_g1_r2_e')],
                [t('table_g1_r3'), true, true, true],
                [t('table_g1_r4'), true, true, true],
                [t('table_g1_r5'), false, true, true],
                [t('table_g1_r6'), false, false, true],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g2'),
              rows: [
                [t('table_g2_r1'), true, true, true],
                [t('table_g2_r2'), false, true, true],
                [t('table_g2_r3'), false, true, true],
                [t('table_g2_r4'), false, true, true],
                [t('table_g2_r5'), t('table_g2_r5_s'), t('table_g2_r5_pe'), t('table_g2_r5_pe')],
                [t('table_g2_r6'), false, true, true],
                [t('table_g2_r7'), false, true, true],
                [t('table_g2_r8'), false, false, true],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g3'),
              rows: [
                [t('table_g3_r1'), false, t('table_g3_r1_pe'), t('table_g3_r1_pe')],
                [t('table_g3_r2'), false, t('table_g3_r2_p'), t('table_g3_r2_e')],
                [t('table_g3_r3'), false, t('table_g3_r3_p'), t('table_g3_r3_e')],
                [t('table_g3_r4'), false, true, true],
                [t('table_g3_r5'), true, true, true],
                [t('table_g3_r6'), false, true, true],
                [t('table_g3_r7'), false, t('table_g3_r7_p'), t('table_g3_r7_e')],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g4'),
              rows: [
                [t('table_g4_r1'), false, true, true],
                [t('table_g4_r2'), false, true, true],
                [t('table_g4_r3'), false, true, true],
                [t('table_g4_r4'), false, true, true],
                [t('table_g4_r5'), false, false, true],
                [t('table_g4_r6'), false, t('table_g4_r6_p'), t('table_g4_r6_e')],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g5'),
              rows: [
                [t('table_g5_r1'), t('table_g5_r1_s'), t('table_g5_r1_p'), t('table_g5_r1_e')],
                [t('table_g5_r2'), false, true, true],
                [t('table_g5_r3'), false, true, true],
                [t('table_g5_r4'), true, true, true],
                [t('table_g5_r5'), false, false, t('table_g5_r5_e')],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g6'),
              rows: [
                [t('table_g6_r1'), true, true, true],
                [t('table_g6_r2'), true, true, true],
                [t('table_g6_r3'), true, true, true],
                [t('table_g6_r4'), t('table_g6_r4_s'), t('table_g6_r4_p'), t('table_g6_r4_e')],
                [t('table_g6_r5'), false, false, true],
                [t('table_g6_r6'), false, false, true],
                [t('table_g6_r7'), false, false, true],
                [t('table_g6_r8'), false, false, true],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g7'),
              rows: [
                [t('table_g7_r1'), false, t('table_g7_r1_p'), t('table_g7_r1_e')],
                [t('table_g7_r2'), false, t('table_g7_r2_p'), t('table_g7_r2_e')],
                [t('table_g7_r3'), false, true, true],
                [t('table_g7_r4'), false, false, true],
                [t('table_g7_r5'), false, false, true],
                [t('table_g7_r6'), false, true, true],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
            {
              title: t('table_g8'),
              rows: [
                [t('table_g8_r1'), t('table_g8_r1_s'), t('table_g8_r1_p'), t('table_g8_r1_e')],
                [t('table_g8_r2'), false, true, true],
                [t('table_g8_r3'), false, false, true],
                [t('table_g8_r4'), false, false, true],
                [t('table_g8_r5'), false, t('table_g8_r5_p'), t('table_g8_r5_e')],
                [t('table_g8_r6'), false, false, t('table_g8_r6_e')],
                [t('table_g8_r7'), t('table_g8_r7_s'), t('table_g8_r7_p'), t('table_g8_r7_e')],
              ] as Array<[string, boolean | string, boolean | string, boolean | string]>,
            },
          ],
        },
        extras: {
          eyebrow: t('extras_eyebrow'),
          title: t('extras_title'),
          subtitle: t('extras_subtitle'),
          items: [
            {
              icon: '⚓',
              title: t('extras_1_title'),
              sub: t('extras_1_sub'),
              price: t('extras_1_price'),
              priceSub: t('extras_1_price_sub'),
              tone: 'mint',
            },
            {
              icon: '🚀',
              title: t('extras_2_title'),
              sub: t('extras_2_sub'),
              price: t('extras_2_price'),
              priceSub: t('extras_2_price_sub'),
              tone: 'coral',
            },
            {
              icon: '🎓',
              title: t('extras_3_title'),
              sub: t('extras_3_sub'),
              price: t('extras_3_price'),
              priceSub: t('extras_3_price_sub'),
              tone: 'navy',
            },
            {
              icon: '🔗',
              title: t('extras_4_title'),
              sub: t('extras_4_sub'),
              price: t('extras_4_price'),
              priceSub: t('extras_4_price_sub'),
              tone: 'bone',
            },
          ],
        },
        faq: {
          eyebrow: t('faq_eyebrow'),
          title: t('faq_title'),
          titleHighlight: t('faq_title_highlight'),
          subtitle: t('faq_subtitle'),
          ctaLabel: t('faq_cta'),
          items: [
            { q: t('faq_q1'), a: t('faq_a1') },
            { q: t('faq_q2'), a: t('faq_a2') },
            { q: t('faq_q3'), a: t('faq_a3') },
            { q: t('faq_q4'), a: t('faq_a4') },
            { q: t('faq_q5'), a: t('faq_a5') },
            { q: t('faq_q6'), a: t('faq_a6') },
            { q: t('faq_q7'), a: t('faq_a7') },
            { q: t('faq_q8'), a: t('faq_a8') },
          ],
        },
        finalCta: {
          title: t('final_cta_title'),
          titleHighlight: t('final_cta_highlight'),
          subtitle: t('final_cta_subtitle'),
          primaryCta: t('final_cta_primary'),
          secondaryCta: t('final_cta_secondary'),
        },
      },
    }
  }

  private buildAboutPageData(i18n: { t: (key: string) => string }) {
    const t = (key: string) => i18n.t(`marketing.about2.${key}`)

    return {
      meta: {
        title: t('meta_title'),
        description: t('meta_description'),
      },
      about: {
        hero: {
          line1: t('hero_line1'),
          line1Highlight: t('hero_line1_highlight'),
          line2: t('hero_line2'),
          line2Highlight: t('hero_line2_highlight'),
          subtitle: t('hero_subtitle'),
        },
        origin: {
          eyebrow: t('origin_eyebrow'),
          title: t('origin_title'),
          paragraphs: [t('origin_p1'), t('origin_p2'), t('origin_p3'), t('origin_p4')],
          captionDate: t('origin_caption_date'),
          captionSub: t('origin_caption_sub'),
        },
        values: {
          eyebrow: t('values_eyebrow'),
          title: t('values_title'),
          titleHighlight: t('values_title_highlight'),
          items: [
            { n: t('values_1_n'), title: t('values_1_title'), desc: t('values_1_desc'), extra: t('values_1_extra') },
            { n: t('values_2_n'), title: t('values_2_title'), desc: t('values_2_desc'), extra: t('values_2_extra') },
            { n: t('values_3_n'), title: t('values_3_title'), desc: t('values_3_desc'), extra: t('values_3_extra') },
            { n: t('values_4_n'), title: t('values_4_title'), desc: t('values_4_desc'), extra: t('values_4_extra') },
          ],
        },
        team: {
          eyebrow: t('team_eyebrow'),
          title: t('team_title'),
          titleHighlight: t('team_title_highlight'),
          subtitle: t('team_subtitle'),
          members: [
            { n: t('team_m1_n'), r: t('team_m1_r'), b: t('team_m1_b'), emoji: '⛵', color: 'coral' },
            { n: t('team_m2_n'), r: t('team_m2_r'), b: t('team_m2_b'), emoji: '💻', color: 'navy' },
            { n: t('team_m3_n'), r: t('team_m3_r'), b: t('team_m3_b'), emoji: '✏️', color: 'mint' },
            { n: t('team_m4_n'), r: t('team_m4_r'), b: t('team_m4_b'), emoji: '⚡', color: 'navy' },
            { n: t('team_m5_n'), r: t('team_m5_r'), b: t('team_m5_b'), emoji: '🔧', color: 'coral' },
            { n: t('team_m6_n'), r: t('team_m6_r'), b: t('team_m6_b'), emoji: '📱', color: 'mint' },
            { n: t('team_m7_n'), r: t('team_m7_r'), b: t('team_m7_b'), emoji: '🤖', color: 'navy' },
            { n: t('team_m8_n'), r: t('team_m8_r'), b: t('team_m8_b'), emoji: '🎨', color: 'coral' },
          ],
          hiringTitle: t('team_hiring_title'),
          hiringSubtitle: t('team_hiring_subtitle'),
          hiringCta: t('team_hiring_cta'),
        },
        numbers: {
          eyebrow: t('numbers_eyebrow'),
          title: t('numbers_title'),
          titleHighlight: t('numbers_title_highlight'),
          stats: [
            { value: t('numbers_stat1_value'), label: t('numbers_stat1_label') },
            { value: t('numbers_stat2_value'), label: t('numbers_stat2_label') },
            { value: t('numbers_stat3_value'), label: t('numbers_stat3_label') },
            { value: t('numbers_stat4_value'), label: t('numbers_stat4_label') },
          ],
          investorsLabel: t('numbers_investors_label'),
          investors: [t('numbers_inv1'), t('numbers_inv2'), t('numbers_inv3'), t('numbers_inv4'), t('numbers_inv5')],
        },
        timeline: {
          eyebrow: t('timeline_eyebrow'),
          title: t('timeline_title'),
          titleHighlight: t('timeline_title_highlight'),
          subtitle: t('timeline_subtitle'),
          items: [
            { d: t('timeline_i1_d'), t: t('timeline_i1_t'), sub: t('timeline_i1_sub'), tone: 'coral' },
            { d: t('timeline_i2_d'), t: t('timeline_i2_t'), sub: t('timeline_i2_sub'), tone: 'mint' },
            { d: t('timeline_i3_d'), t: t('timeline_i3_t'), sub: t('timeline_i3_sub'), tone: 'coral' },
            { d: t('timeline_i4_d'), t: t('timeline_i4_t'), sub: t('timeline_i4_sub'), tone: 'mint' },
            { d: t('timeline_i5_d'), t: t('timeline_i5_t'), sub: t('timeline_i5_sub'), tone: 'mint' },
            { d: t('timeline_i6_d'), t: t('timeline_i6_t'), sub: t('timeline_i6_sub'), tone: '' },
            { d: t('timeline_i7_d'), t: t('timeline_i7_t'), sub: t('timeline_i7_sub'), tone: '' },
            { d: t('timeline_i8_d'), t: t('timeline_i8_t'), sub: t('timeline_i8_sub'), tone: 'coral' },
          ],
        },
        office: {
          eyebrow: t('office_eyebrow'),
          title: t('office_title'),
          titleHighlight: t('office_title_highlight'),
          body: t('office_body'),
          locationLabel: t('office_location_label'),
          locations: [
            { city: t('office_loc1_city'), addr: t('office_loc1_addr'), role: t('office_loc1_role') },
            { city: t('office_loc2_city'), addr: t('office_loc2_addr'), role: t('office_loc2_role') },
            { city: t('office_loc3_city'), addr: t('office_loc3_addr'), role: t('office_loc3_role') },
          ],
          officeCards: [
            {
              city: t('office_card1_city'),
              role: t('office_card1_role'),
              addr: t('office_card1_addr'),
              hours: t('office_card1_hours'),
              team: t('office_card1_team'),
              hint: t('office_card1_hint'),
              gradient: 'from-navy-900 to-navy-800',
            },
            {
              city: t('office_card2_city'),
              role: t('office_card2_role'),
              addr: t('office_card2_addr'),
              hours: t('office_card2_hours'),
              team: t('office_card2_team'),
              hint: t('office_card2_hint'),
              gradient: 'from-coral-500 to-coral-400',
            },
          ],
        },
        finalCta: {
          title: t('final_cta_title'),
          titleHighlight: t('final_cta_highlight'),
          subtitle: t('final_cta_subtitle'),
          primaryCta: t('final_cta_primary'),
          secondaryCta: t('final_cta_secondary'),
        },
      },
    }
  }

  private buildContactPageData(i18n: { t: (key: string) => string }) {
    const t = (key: string) => i18n.t(`marketing.contact2.${key}`)

    return {
      meta: {
        title: t('meta_title'),
        description: t('meta_description'),
      },
      contact: {
        hero: {
          eyebrow: t('hero_eyebrow'),
          title: t('hero_title'),
          titleHighlight: t('hero_title_highlight'),
          subtitle: t('hero_subtitle'),
        },
        channels: [
          { icon: t('ch1_icon'), title: t('ch1_title'), desc: t('ch1_desc'), cta: t('ch1_cta'), tone: 'navy' },
          { icon: t('ch2_icon'), title: t('ch2_title'), desc: t('ch2_desc'), cta: t('ch2_cta'), tone: 'coral' },
          { icon: t('ch3_icon'), title: t('ch3_title'), desc: t('ch3_desc'), cta: t('ch3_cta'), tone: '' },
          { icon: t('ch4_icon'), title: t('ch4_title'), desc: t('ch4_desc'), cta: t('ch4_cta'), tone: '' },
        ],
        form: {
          eyebrow: t('form_eyebrow'),
          title: t('form_title'),
          subjects: [
            t('form_subject1'),
            t('form_subject2'),
            t('form_subject3'),
            t('form_subject4'),
            t('form_subject5'),
            t('form_subject6'),
          ],
          firstNameLabel: t('form_first_name'),
          lastNameLabel: t('form_last_name'),
          emailLabel: t('form_email'),
          orgLabel: t('form_org'),
          fleetSizeLabel: t('form_fleet_size'),
          messageLabel: t('form_message'),
          messagePlaceholder: t('form_message_placeholder'),
          privacyText: t('form_privacy_text'),
          privacyLinkLabel: t('form_privacy_link'),
          submitLabel: t('form_submit'),
          responseTime: t('form_response_time'),
          otherMeansTitle: t('form_other_means'),
          sidebarContacts: [
            { icon: t('sidebar_c1_icon'), label: t('sidebar_c1_label'), sub: t('sidebar_c1_sub') },
            { icon: t('sidebar_c2_icon'), label: t('sidebar_c2_label'), sub: t('sidebar_c2_sub') },
            { icon: t('sidebar_c3_icon'), label: t('sidebar_c3_label'), sub: t('sidebar_c3_sub') },
          ],
          ctaTitle: t('sidebar_cta_title'),
          ctaSubtitle: t('sidebar_cta_subtitle'),
          ctaButton: t('sidebar_cta_btn'),
        },
        offices: {
          eyebrow: t('offices_eyebrow'),
          title: t('offices_title'),
          titleHighlight: t('offices_title_highlight'),
          subtitle: t('offices_subtitle'),
          items: [
            {
              city: t('office1_city'),
              role: t('office1_role'),
              addr: t('office1_addr'),
              hours: t('office1_hours'),
              team: t('office1_team'),
              hint: t('office1_hint'),
              gradient: 'from-navy-900 to-navy-800',
            },
            {
              city: t('office2_city'),
              role: t('office2_role'),
              addr: t('office2_addr'),
              hours: t('office2_hours'),
              team: t('office2_team'),
              hint: t('office2_hint'),
              gradient: 'from-coral-500 to-coral-400',
            },
          ],
        },
        faq: {
          eyebrow: t('faq_eyebrow'),
          title: t('faq_title'),
          titleHighlight: t('faq_title_highlight'),
          items: [
            { q: t('faq_q1'), a: t('faq_a1') },
            { q: t('faq_q2'), a: t('faq_a2') },
            { q: t('faq_q3'), a: t('faq_a3') },
            { q: t('faq_q4'), a: t('faq_a4') },
            { q: t('faq_q5'), a: t('faq_a5') },
          ],
        },
      },
    }
  }
}
