import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { findUnsafeColors, formatUnsafeColors, UNSAFE_COLOR_PATTERNS } from './helpers/theme_tokens'

/**
 * Garde-fou du thème sombre (#416), composant par composant.
 *
 * Le thème bascule en redéfinissant des variables CSS sous `[data-theme='dark']` :
 * une couleur écrite en dur n'en fait pas partie et reste figée pendant que le
 * reste de la page s'inverse. Ces tests relisent le **source** de chaque
 * composant dont la PR #416 a réécrit les couleurs, et échouent si l'un d'eux
 * en réintroduit une.
 *
 * Pourquoi lire le source plutôt que monter le composant : un `mount()` ne voit
 * que la branche rendue, alors que les classes vivent souvent dans une map
 * (`const VARIANTS: Record<string, string>`) dont un test n'exerce qu'une
 * entrée. Le scan couvre toutes les branches, et n'oblige pas à fabriquer les
 * props structurées des sections marketing.
 *
 * `allow` = exception assumée. Chaque entrée porte sa raison ; les deux
 * méta-tests en fin de fichier empêchent qu'elle devienne un mensonge.
 */

// `import.meta.url` n'est pas une URL `file:` sous happy-dom : on résout depuis
// la racine du projet. `vitest.config.ts` ne définit pas de `root`, donc le cwd
// est bien la racine. Le test « chaque composant listé existe encore » plus bas
// échouerait bruyamment si ce n'était pas le cas.
const INERTIA_ROOT = resolve(process.cwd(), 'inertia')

interface Exception {
  /** La chaîne exacte tolérée, ex. `bg-white` ou `fill="#faf6ee"`. */
  pattern: string
  /**
   * Nombre d'occurrences attendues — pas un simple interrupteur.
   *
   * Neutraliser une chaîne pour tout un fichier laisserait passer une nouvelle
   * occurrence illégitime de la même classe : un `bg-white` ajouté sur un titre
   * serait couvert par l'exception qui protège une grille décorative. Le budget
   * force à revenir ici, donc à justifier.
   */
  count: number
  reason: string
}

interface Component {
  /** Chemin relatif à `inertia/`. */
  path: string
  allow?: Exception[]
}

/** Raisons partagées, pour que le motif se lise d'un coup d'œil. */
const NAVY_BAND = 'sur un bandeau navy permanent (sombre dans les deux thèmes) — doit rester clair'
const MOCK_ILLUSTRATION =
  'maquette d’écran décorative : palette interne cohérente, ne suit pas le thème de la page'
const DECORATIVE_SVG = 'SVG décoratif en faible opacité sur panneau navy permanent'
/**
 * Le pendant du précédent pour la règle « palette navy à contre-rôle » (#457) :
 * un palier navy foncé posé sur une surface **elle aussi** permanente (sidebar,
 * carte navy, bouton clair d'un bandeau navy) reste cohérent dans les deux
 * thèmes. C'est le seul cas où le navy à contre-rôle est légitime.
 */
const NAVY_ON_NAVY =
  'palier navy posé sur une surface navy permanente — cohérent dans les deux thèmes'

/**
 * Les 80 composants dont la PR #416 a réécrit les couleurs.
 * Ajouter ici tout composant dont on veut garantir qu'il bascule.
 */
const COMPONENTS: Component[] = [
  { path: 'components/ConflictResolutionModal.vue' },
  { path: 'components/Logo.vue' },
  { path: 'components/OfflinePendingQueue.vue' },
  // Sections extraites de `pages/auth/signup.vue` (#448) : la page était déjà
  // couverte, ces composants héritent de cette couverture.
  { path: 'components/auth/signup/SignupIdentityFields.vue' },
  { path: 'components/auth/signup/SignupOrganizationFields.vue' },
  { path: 'components/auth/signup/SignupSectionHeader.vue' },
  { path: 'components/auth/signup/SignupTermsCheckbox.vue' },
  { path: 'components/base/BaseBadge.vue' },
  { path: 'components/base/BaseButton.vue' },
  { path: 'components/base/BaseDropdown.vue' },
  { path: 'components/base/BaseFormErrorSummary.vue' },
  { path: 'components/base/BaseOptionCard.vue' },
  { path: 'components/base/BaseSegmentedControl.vue' },
  { path: 'components/base/BaseTabs.vue' },
  { path: 'components/base/UpgradePlanModal.vue' },
  { path: 'components/boats/budget/BudgetCategoryCard.vue' },
  { path: 'components/boats/budget/BudgetEntryList.vue' },
  { path: 'components/boats/budget/BudgetPortStayList.vue' },
  { path: 'components/boats/equipment-actions/BoatEquipmentActionCard.vue' },
  { path: 'components/boats/maintenance/BoatTaskActions.vue' },
  { path: 'components/boats/rig/BoatShowRigCard.vue' },
  { path: 'components/boats/sail/BoatShowSailsCard.vue' },
  // Panneaux Assistant IA — panneaux navy permanents, exception documentée dans
  // CLAUDE.md (#457).
  { path: 'components/boats/show/tabs/overview/BoatOverviewAiPanel.vue' },
  {
    path: 'components/dashboard/DashboardAiPanel.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  { path: 'components/layout/AppHeader.vue' },
  { path: 'components/layout/AppHeaderMobileDrawer.vue' },
  { path: 'components/layout/MobileBottomNav.vue' },
  {
    path: 'components/layout/AsideMenu.vue',
    allow: [{ pattern: 'border-navy-700', count: 2, reason: NAVY_ON_NAVY }],
  },
  { path: 'components/layout/DemoSessionBanner.vue' },
  {
    path: 'components/layout/MobileSidebarDrawer.vue',
    allow: [{ pattern: 'border-navy-700', count: 2, reason: NAVY_ON_NAVY }],
  },
  { path: 'components/layout/NotificationBell.vue' },
  { path: 'components/layout/ThemeSwitcher.vue' },
  {
    path: 'components/marketing/about/AboutOfficeSection.vue',
    allow: [{ pattern: 'fill="#faf6ee"', count: 2, reason: DECORATIVE_SVG }],
  },
  { path: 'components/marketing/about/AboutTeamSection.vue' },
  { path: 'components/marketing/about/AboutValuesSection.vue' },
  {
    path: 'components/marketing/contact/ContactChannelsSection.vue',
    allow: [{ pattern: 'border-navy-900', count: 1, reason: NAVY_ON_NAVY }],
  },
  { path: 'components/marketing/contact/ContactFaqSection.vue' },
  { path: 'components/marketing/contact/ContactFormSection.vue' },
  {
    path: 'components/marketing/contact/ContactFormSidebar.vue',
    allow: [
      { pattern: 'fill="#faf6ee"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'fill="#e2674f"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  { path: 'components/marketing/contact/ContactPillGroup.vue' },
  { path: 'components/marketing/contact/ContactHeroSection.vue' },
  {
    path: 'components/marketing/contact/ContactOfficesSection.vue',
    allow: [{ pattern: 'fill="#faf6ee"', count: 2, reason: DECORATIVE_SVG }],
  },
  {
    path: 'components/marketing/home/HomeBentoGridSection.vue',
    allow: [{ pattern: 'bg-white', count: 1, reason: `grille de pontons décorative ${NAVY_BAND}` }],
  },
  { path: 'components/marketing/home/HomeCaseStudySection.vue' },
  { path: 'components/marketing/home/HomeDemoSection.vue' },
  {
    path: 'components/marketing/home/HomeFaqCtaSection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  { path: 'components/marketing/home/HomeFaqSection.vue' },
  { path: 'components/marketing/home/HomeHeroSection.vue' },
  { path: 'components/marketing/home/HomeIndustriesSection.vue' },
  {
    path: 'components/marketing/home/HomeMockBoatDetail.vue',
    allow: [
      { pattern: 'stroke="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#e2674f"', count: 1, reason: MOCK_ILLUSTRATION },
      {
        pattern: 'style="background: linear-gradient(180deg, #0b1d2e 0%, #102a40',
        count: 1,
        reason: MOCK_ILLUSTRATION,
      },
    ],
  },
  {
    path: 'components/marketing/home/HomeMockDashboard.vue',
    allow: [
      { pattern: 'stroke="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#e2674f"', count: 1, reason: MOCK_ILLUSTRATION },
      {
        pattern: 'style="background: linear-gradient(180deg, #0b1d2e 0%, #102a40',
        count: 1,
        reason: MOCK_ILLUSTRATION,
      },
    ],
  },
  {
    path: 'components/marketing/home/HomeMockFleetide.vue',
    allow: [
      { pattern: 'stroke="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#e2674f"', count: 1, reason: MOCK_ILLUSTRATION },
      {
        pattern: 'style="background: linear-gradient(180deg, #0b1d2e 0%, #102a40',
        count: 1,
        reason: MOCK_ILLUSTRATION,
      },
      {
        pattern: 'style="background: linear-gradient(180deg, #5a4a8a 0%, #4a3a7a',
        count: 1,
        reason: MOCK_ILLUSTRATION,
      },
    ],
  },
  {
    path: 'components/marketing/home/HomeMockPlanning.vue',
    allow: [
      { pattern: 'stroke="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#faf6ee"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#e2674f"', count: 1, reason: MOCK_ILLUSTRATION },
      {
        pattern: 'style="background: linear-gradient(180deg, #0b1d2e 0%, #102a40',
        count: 1,
        reason: MOCK_ILLUSTRATION,
      },
    ],
  },
  { path: 'components/marketing/home/HomeModularOfferSection.vue' },
  { path: 'components/marketing/home/HomePersonasSection.vue' },
  { path: 'components/marketing/home/HomePillarsSection.vue' },
  { path: 'components/marketing/home/HomeProblemSection.vue' },
  { path: 'components/marketing/home/HomeProofSections.vue' },
  { path: 'components/marketing/home/HomeSecuritySection.vue' },
  { path: 'components/marketing/home/HomeTestimonialsSection.vue' },
  {
    path: 'components/marketing/pricing/PricingConfigurator.vue',
    allow: [{ pattern: 'border-navy-900', count: 1, reason: NAVY_ON_NAVY }],
  },
  { path: 'components/marketing/pricing/PricingConfiguratorModuleCard.vue' },
  {
    path: 'components/marketing/pricing/PricingDetailedTableSection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  { path: 'components/marketing/pricing/PricingFaqSection.vue' },
  {
    path: 'components/marketing/pricing/PricingPlansGrid.vue',
    allow: [{ pattern: 'ring-navy-600', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/marketing/pricing/PricingROISection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  { path: 'components/marketing/pricing/PricingTestimonialsSection.vue' },
  { path: 'components/marketing/simulator/SimulatorStepBoat.vue' },
  { path: 'components/marketing/simulator/SimulatorStepWear.vue' },
  { path: 'components/marketing/simulator/SimulatorStepWintering.vue' },
  { path: 'components/planning/PlanningCalendar.vue' },
  { path: 'components/planning/PlanningCalendarHourTasks.vue' },
  { path: 'components/planning/PlanningKanban.vue' },
  { path: 'components/planning/PlanningTaskGroup.vue' },
  { path: 'components/reservations/ReservationTimeline.vue' },
  { path: 'components/settings/SettingsBillingExtraBoats.vue' },
  { path: 'components/settings/SettingsBillingModules.vue' },
  { path: 'components/settings/SettingsBillingUsageGauge.vue' },
  { path: 'components/settings/me/ThemeCard.vue' },
  { path: 'components/settings/tabs/SettingsBillingTab.vue' },
  { path: 'components/settings/tabs/SettingsImportTab.vue' },
  { path: 'components/settings/tabs/SettingsMeTab.vue' },
  { path: 'pages/auth/forgot_password.vue' },
  { path: 'pages/dashboard.vue' },
  { path: 'pages/auth/login.vue' },
  { path: 'pages/auth/reset_password.vue' },
  { path: 'pages/auth/signup.vue' },
  { path: 'pages/marketing/privacy.vue' },
  { path: 'pages/marketing/simulator.vue' },
  { path: 'pages/marketing/simulator_share.vue' },
  { path: 'pages/notifications/index.vue' },
  { path: 'pages/planning/index.vue' },
]

function read(path: string): string {
  return readFileSync(`${INERTIA_ROOT}/${path}`, 'utf8')
}

describe('dark mode (#416) · aucune couleur figée par composant', () => {
  for (const component of COMPONENTS) {
    test(component.path, () => {
      const hits = findUnsafeColors(read(component.path))
      const budget = new Map((component.allow ?? []).map((e) => [e.pattern, e.count]))

      // Quand une classe dépasse son budget, on remonte *toutes* ses
      // occurrences : impossible de deviner laquelle est l'intruse, et pointer
      // arbitrairement la première enverrait le lecteur sur l'usage légitime.
      const byMatch = new Map<string, typeof hits>()
      for (const hit of hits) {
        byMatch.set(hit.match, [...(byMatch.get(hit.match) ?? []), hit])
      }

      const unexpected = [...byMatch.values()]
        .filter((group) => group.length > (budget.get(group[0].match) ?? 0))
        .flat()
        .sort((a, b) => a.line - b.line)

      expect(
        unexpected,
        unexpected.length
          ? formatUnsafeColors(component.path, unexpected, component.allow ?? [])
          : ''
      ).toEqual([])
    })
  }
})

describe('dark mode (#416) · cohérence de la table', () => {
  test('chaque composant listé existe encore', () => {
    const missing = COMPONENTS.filter((c) => {
      try {
        read(c.path)
        return false
      } catch {
        return true
      }
    })

    expect(
      missing.map((c) => c.path),
      'des composants de la table ont été déplacés ou supprimés — mettre la table à jour'
    ).toEqual([])
  })

  test('aucune exception périmée ou surdimensionnée', () => {
    // Un budget plus large que la réalité couvre silencieusement une future
    // réintroduction : il doit coller exactement au nombre d'occurrences.
    const stale: string[] = []

    for (const component of COMPONENTS) {
      if (!component.allow) continue
      const hits = findUnsafeColors(read(component.path))
      for (const exception of component.allow) {
        const actual = hits.filter((h) => h.match === exception.pattern).length
        if (actual !== exception.count) {
          stale.push(
            `${component.path} → « ${exception.pattern} » : budget ${exception.count}, trouvé ${actual}`
          )
        }
      }
    }

    expect(
      stale,
      'budgets d’exception désynchronisés : ajuster le `count`, ou supprimer l’entrée si la couleur a disparu'
    ).toEqual([])
  })

  test('chaque exception porte une raison lisible', () => {
    const unexplained = COMPONENTS.flatMap((c) =>
      (c.allow ?? [])
        .filter((e) => e.reason.trim().length < 20)
        .map((e) => `${c.path} → ${e.pattern}`)
    )

    expect(unexplained, 'une exception sans justification claire est une dette invisible').toEqual(
      []
    )
  })

  test('le détecteur reconnaît bien les couleurs qui ne basculent pas', () => {
    // Garde-fou du garde-fou : si les motifs cessaient de matcher, les 80 tests
    // ci-dessus passeraient au vert sans rien vérifier.
    const samples = [
      '<div class="bg-red-100 text-gray-600">',
      '<div class="bg-white">',
      '<div class="text-[#ff0000]">',
      '<div style="background: #ff0000">',
      '<path fill="#ff0000" />',
      // #457 — navy pâle en fond, navy foncé en encre : les deux rôles que
      // `[data-theme='dark']` ne réinverse pas.
      '<div class="bg-navy-25">',
      '<div class="bg-navy-100 text-navy-700">',
      '<div class="border-navy-900">',
    ]

    for (const sample of samples) {
      expect(findUnsafeColors(sample), `non détecté : ${sample}`).not.toEqual([])
    }

    // …et qu'il ne crie pas sur ce qui est correct.
    const safe = [
      '<div class="bg-surface-elevated text-fg-muted border-border">',
      '<div class="bg-brand text-on-brand">',
      '<div class="bg-white/10 text-white/60">',
      '<div class="bg-mint-100 text-mint-700">',
      // La recette du panneau navy permanent : aplat foncé, encre claire.
      '<div class="bg-navy-900 text-navy-100">',
      // Tons moyens : lisibles des deux côtés, jamais réinversés donc jamais faux.
      '<div class="bg-navy-500 text-white">',
      '<path fill="var(--color-fg)" />',
      '<!-- bg-red-100 dans un commentaire ne compte pas -->',
    ]

    for (const sample of safe) {
      expect(findUnsafeColors(sample), `faux positif : ${sample}`).toEqual([])
    }

    expect(UNSAFE_COLOR_PATTERNS.length).toBeGreaterThan(0)
  })
})
