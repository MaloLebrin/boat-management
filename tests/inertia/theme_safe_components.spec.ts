import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { findUnsafeColors, formatUnsafeColors, UNSAFE_COLOR_PATTERNS } from './helpers/theme_tokens'

/**
 * Garde-fou du thème sombre (#416), sur **tout** `inertia/`.
 *
 * Le thème bascule en redéfinissant des variables CSS sous `[data-theme='dark']` :
 * une couleur écrite en dur n'en fait pas partie et reste figée pendant que le
 * reste de la page s'inverse. Ce test relit le **source** de chaque fichier
 * `.vue` et `.ts` d'`inertia/` et échoue dès que l'un d'eux en introduit une.
 *
 * Il a d'abord été une liste d'opt-in de 94 composants (ceux réécrits par
 * #416) : un `bg-blue-100` posé dans un composable `.ts` ou dans un composant
 * jamais listé passait sans bruit. Le scan est désormais exhaustif ; seules
 * les **exceptions** restent déclarées, avec leur raison et leur budget.
 *
 * Pourquoi lire le source plutôt que monter le composant : un `mount()` ne voit
 * que la branche rendue, alors que les classes vivent souvent dans une map
 * (`const VARIANTS: Record<string, string>`) dont un test n'exerce qu'une
 * entrée. Le scan couvre toutes les branches, et n'oblige pas à fabriquer les
 * props structurées des sections marketing.
 *
 * `allow` = exception assumée. Chaque entrée porte sa raison ; les méta-tests
 * en fin de fichier empêchent qu'elle devienne un mensonge.
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
  /** Chemin relatif à `inertia/` (séparateur `/`). */
  path: string
  allow?: Exception[]
}

/** Raisons partagées, pour que le motif se lise d'un coup d'œil. */
const NAVY_BAND = 'sur un bandeau navy permanent (sombre dans les deux thèmes) — doit rester clair'
const MOCK_ILLUSTRATION =
  'maquette d’écran décorative : palette interne cohérente, ne suit pas le thème de la page'
const DECORATIVE_SVG = 'SVG décoratif en faible opacité sur panneau navy permanent'
const MARINA_MAP =
  'carte marina : illustration autonome (eau, pontons) à palette propre, cohérente dans les deux thèmes'
/**
 * Le pendant du précédent pour la règle « palette navy à contre-rôle » (#457) :
 * un palier navy foncé posé sur une surface **elle aussi** permanente (sidebar,
 * carte navy, bouton clair d'un bandeau navy) reste cohérent dans les deux
 * thèmes. C'est le seul cas où le navy à contre-rôle est légitime.
 */
const NAVY_ON_NAVY =
  'palier navy posé sur une surface navy permanente — cohérent dans les deux thèmes'

/**
 * Les seules couleurs figées assumées d'`inertia/`. Tout fichier absent d'ici
 * doit être exempt de couleur qui ne bascule pas.
 */
const EXCEPTIONS: Component[] = [
  // Panneaux Assistant IA, diagnostic et pièces — panneaux navy permanents,
  // exception documentée dans CLAUDE.md (#457).
  {
    path: 'components/assistant/AssistantActionCard.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/assistant/AssistantComposer.vue',
    allow: [{ pattern: 'border-navy-600', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/assistant/AssistantPanel.vue',
    allow: [{ pattern: 'border-navy-700', count: 3, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/assistant/AssistantThread.vue',
    allow: [{ pattern: 'border-navy-600', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/assistant/AssistantUpsell.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/diagnostic/DiagnosticAiPanel.vue',
    allow: [{ pattern: 'border-navy-600', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/spare_parts/chat/SparePartsAiEntryCard.vue',
    allow: [{ pattern: 'border-navy-600', count: 1, reason: NAVY_ON_NAVY }],
  },
  // Panneau navy des pages d'authentification (`AuthNavyPanel`) : exception
  // documentée dans CLAUDE.md. Ce qui avait un token (accent corail, avatar
  // navy) l'utilise désormais ; restent la boussole décorative et l'accent
  // lilas de la maquette de carte IA, sans équivalent dans la palette.
  {
    path: 'components/auth/AuthNavyPanel.vue',
    allow: [
      { pattern: 'fill="#faf6ee"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'fill="#e2674f"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'fill="#0b1d2e"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'stroke="#faf6ee"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'stroke="#bcb1e0"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'text-[#bcb1e0]', count: 1, reason: MOCK_ILLUSTRATION },
    ],
  },
  // Sidebar et coquille de l'app : surfaces navy permanentes.
  {
    path: 'components/layout/NavScrollArea.vue',
    allow: [{ pattern: 'ring-navy-600', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'layouts/default.vue',
    allow: [{ pattern: 'border-navy-700', count: 1, reason: NAVY_ON_NAVY }],
  },
  // Carte marina (#SVG interactif) : illustration autonome, palette propre
  // (eau, bois des pontons) cohérente dans les deux thèmes.
  {
    path: 'components/ports/show/MarinaCanvas.vue',
    allow: [
      { pattern: 'fill="#D6EAF8"', count: 1, reason: MARINA_MAP },
      { pattern: 'fill="#B0C9DD"', count: 1, reason: MARINA_MAP },
    ],
  },
  {
    path: 'components/ports/show/MarinaMouillage.vue',
    allow: [
      { pattern: 'stroke="#2196F3"', count: 2, reason: MARINA_MAP },
      { pattern: 'fill="#1565C0"', count: 2, reason: MARINA_MAP },
      { pattern: 'fill="#2196F3"', count: 1, reason: MARINA_MAP },
    ],
  },
  {
    path: 'components/ports/show/MarinaPontoon.vue',
    allow: [
      { pattern: 'fill="#5D4037"', count: 3, reason: MARINA_MAP },
      { pattern: 'stroke="#5D4037"', count: 1, reason: MARINA_MAP },
    ],
  },
  // Marketing : bandeaux navy et illustrations autonomes.
  {
    path: 'components/marketing/about/AboutNumbersSection.vue',
    allow: [
      { pattern: 'fill="#faf6ee"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'fill="#e2674f"', count: 1, reason: DECORATIVE_SVG },
    ],
  },
  {
    path: 'components/marketing/about/AboutOriginSection.vue',
    allow: [
      {
        pattern: 'style="aspect-ratio: 4/5; background: linear-gradient(135deg, #dde7f0, #faf6ee',
        count: 1,
        reason: MOCK_ILLUSTRATION,
      },
      { pattern: 'fill="#fbeacb"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#1a3a55"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#0b1d2e"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#faf6ee"', count: 2, reason: MOCK_ILLUSTRATION },
      { pattern: 'fill="#e2674f"', count: 1, reason: MOCK_ILLUSTRATION },
      { pattern: 'stroke="#0b1d2e"', count: 4, reason: MOCK_ILLUSTRATION },
    ],
  },
  {
    path: 'components/marketing/home/HomeFinalCtaSection.vue',
    allow: [
      { pattern: 'stroke="#faf6ee"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'fill="#faf6ee"', count: 2, reason: DECORATIVE_SVG },
      { pattern: 'fill="#e2674f"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton crème ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/marketing/home/HomeHowItWorksSection.vue',
    allow: [{ pattern: 'border-navy-800', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/marketing/pricing/PricingExtrasSection.vue',
    allow: [{ pattern: 'border-navy-900', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/marketing/pricing/PricingHeroSection.vue',
    allow: [
      { pattern: 'bg-white', count: 2, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 2, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/marketing/pricing/PricingTiersSection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  // Panneaux Assistant IA — panneaux navy permanents, exception documentée dans
  // CLAUDE.md (#457).
  {
    path: 'components/dashboard/DashboardAiPanel.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/layout/AsideMenu.vue',
    allow: [{ pattern: 'border-navy-700', count: 2, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/layout/MobileSidebarDrawer.vue',
    allow: [{ pattern: 'border-navy-700', count: 2, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/marketing/about/AboutOfficeSection.vue',
    allow: [{ pattern: 'fill="#faf6ee"', count: 2, reason: DECORATIVE_SVG }],
  },
  {
    path: 'components/marketing/contact/ContactChannelsSection.vue',
    allow: [{ pattern: 'border-navy-900', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/marketing/contact/ContactFormSidebar.vue',
    allow: [
      { pattern: 'fill="#faf6ee"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'fill="#e2674f"', count: 1, reason: DECORATIVE_SVG },
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/marketing/contact/ContactOfficesSection.vue',
    allow: [{ pattern: 'fill="#faf6ee"', count: 2, reason: DECORATIVE_SVG }],
  },
  {
    path: 'components/marketing/home/HomeFaqCtaSection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
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
  {
    path: 'components/marketing/pricing/PricingConfigurator.vue',
    allow: [{ pattern: 'border-navy-900', count: 1, reason: NAVY_ON_NAVY }],
  },
  {
    path: 'components/marketing/pricing/PricingDetailedTableSection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
  {
    path: 'components/marketing/pricing/PricingROISection.vue',
    allow: [
      { pattern: 'bg-white', count: 1, reason: `bouton blanc ${NAVY_BAND}` },
      { pattern: 'text-navy-900', count: 1, reason: `encre du bouton blanc ${NAVY_BAND}` },
    ],
  },
]

function read(path: string): string {
  return readFileSync(`${INERTIA_ROOT}/${path}`, 'utf8')
}

/** Tous les `.vue` et `.ts` d'`inertia/`, en chemins relatifs triés. */
function listSources(): string[] {
  return readdirSync(INERTIA_ROOT, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(vue|ts)$/.test(file) && !file.endsWith('.d.ts'))
    .map((file) => file.split('\\').join('/'))
    .sort()
}

const SOURCES = listSources()
const EXCEPTIONS_BY_PATH = new Map(EXCEPTIONS.map((c) => [c.path, c]))

describe('dark mode (#416) · aucune couleur figée dans inertia/', () => {
  test('le scan voit bien toute la base', () => {
    // Si `readdirSync` cessait de descendre dans l'arborescence, les tests
    // ci-dessous passeraient au vert sur une liste vide.
    expect(SOURCES.length).toBeGreaterThan(400)
    expect(SOURCES).toContain('components/base/BaseButton.vue')
    expect(SOURCES).toContain('composables/use_t.ts')
  })

  for (const path of SOURCES) {
    test(path, () => {
      const component = EXCEPTIONS_BY_PATH.get(path)
      const hits = findUnsafeColors(read(path))
      const budget = new Map((component?.allow ?? []).map((e) => [e.pattern, e.count]))

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
        unexpected.length ? formatUnsafeColors(path, unexpected, component?.allow ?? []) : ''
      ).toEqual([])
    })
  }
})

describe('dark mode (#416) · cohérence de la table', () => {
  test('chaque exception vise un fichier qui existe encore', () => {
    const missing = EXCEPTIONS.filter((c) => {
      try {
        read(c.path)
        return false
      } catch {
        return true
      }
    })

    expect(
      missing.map((c) => c.path),
      'des fichiers de la table ont été déplacés ou supprimés — mettre la table à jour'
    ).toEqual([])
  })

  test('aucune exception périmée ou surdimensionnée', () => {
    // Un budget plus large que la réalité couvre silencieusement une future
    // réintroduction : il doit coller exactement au nombre d'occurrences.
    const stale: string[] = []

    for (const component of EXCEPTIONS) {
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
    const unexplained = EXCEPTIONS.flatMap((c) =>
      (c.allow ?? [])
        .filter((e) => e.reason.trim().length < 20)
        .map((e) => `${c.path} → ${e.pattern}`)
    )

    expect(unexplained, 'une exception sans justification claire est une dette invisible').toEqual(
      []
    )
  })

  test('le détecteur reconnaît bien les couleurs qui ne basculent pas', () => {
    // Garde-fou du garde-fou : si les motifs cessaient de matcher, les tests
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
