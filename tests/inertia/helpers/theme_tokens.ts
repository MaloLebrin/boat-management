/**
 * Détecteur de couleurs qui ne basculent pas avec le thème (#416).
 *
 * Le thème sombre repose entièrement sur la redéfinition de variables CSS sous
 * `[data-theme='dark']` (voir `inertia/css/app.css`). Une couleur écrite en dur
 * — palette Tailwind par défaut, `bg-white` opaque, hex brut — ne fait donc
 * pas partie du système et reste figée quand le reste de la page bascule.
 *
 * Ce module lit le **source** d'un SFC plutôt que son rendu : un `mount()` ne
 * voit que la branche rendue, alors qu'un composant déclare souvent ses classes
 * dans une map (`const VARIANTS: Record<string, string>`) dont une seule entrée
 * sera exercée par un test donné.
 */

/** Palettes Tailwind par défaut : elles n'existent pas dans `@theme`, donc ne basculent jamais. */
const DEFAULT_TAILWIND_HUES = [
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'gray',
  'slate',
  'zinc',
  'neutral',
  'stone',
].join('|')

/** Préfixes d'utilitaires Tailwind qui portent une couleur. */
const COLOR_UTILITIES = 'bg|text|border|ring|divide|from|to|via|fill|stroke|accent|outline|shadow'

export interface UnsafeColorPattern {
  name: string
  regex: RegExp
  hint: string
}

export const UNSAFE_COLOR_PATTERNS: UnsafeColorPattern[] = [
  {
    name: 'palette Tailwind par défaut',
    regex: new RegExp(`\\b(?:${COLOR_UTILITIES})-(?:${DEFAULT_TAILWIND_HUES})-\\d{2,3}\\b`, 'g'),
    hint: 'utiliser un token sémantique (text-danger, bg-surface-muted…) ou une palette de marque (coral, mint, amber, violet, sky, lilac, peach)',
  },
  {
    // `bg-white/10` est un voile translucide sur un fond déjà sombre : légitime.
    // Seule la version opaque fige la surface.
    name: 'bg-white / bg-black opaque',
    regex: /\b(?:bg|border|ring|divide|fill|stroke)-(?:white|black)(?![/\w-])/g,
    hint: 'utiliser bg-surface-elevated / border-border (la variante translucide `/10` reste permise)',
  },
  {
    name: 'couleur arbitraire en hex',
    regex: new RegExp(`\\b(?:${COLOR_UTILITIES})-\\[#[0-9a-fA-F]{3,8}\\]`, 'g'),
    hint: 'utiliser un token, ou `text-[var(--color-…)]` si un cas particulier l’impose',
  },
  {
    name: 'hex brut dans un attribut style',
    regex: /style="[^"]*#[0-9a-fA-F]{3,8}/g,
    hint: 'utiliser une classe utilitaire, ou var(--color-…) si le style inline est indispensable',
  },
  {
    name: 'hex brut dans un attribut SVG',
    regex: /\b(?:fill|stroke|stop-color)="#[0-9a-fA-F]{3,8}"/g,
    hint: 'utiliser currentColor ou var(--color-…) pour que le tracé suive le thème',
  },
]

export interface UnsafeColorHit {
  /** 1-indexé, pour pointer directement la ligne dans l'éditeur. */
  line: number
  /** La chaîne fautive exacte, ex. `bg-red-100`. */
  match: string
  /** Nom du motif déclenché. */
  pattern: string
  /** Comment corriger. */
  hint: string
  /** La ligne source, tronquée, pour situer le contexte. */
  snippet: string
}

/**
 * Retire les commentaires HTML et JS du source, en préservant les sauts de
 * ligne pour que les numéros restent justes. Les exceptions assumées de la PR
 * sont documentées en commentaire au-dessus de la ligne concernée : les
 * scanner produirait des faux positifs sur leur propre justification.
 */
function stripComments(source: string): string {
  const blank = (m: string) => m.replaceAll(/[^\n]/g, ' ')
  return source
    .replaceAll(/<!--[\s\S]*?-->/g, blank)
    .replaceAll(/\/\*[\s\S]*?\*\//g, blank)
    .replaceAll(
      /(^|[^:])\/\/[^\n]*/g,
      (m, prefix: string) => prefix + blank(m.slice(prefix.length))
    )
}

/**
 * Toutes les couleurs figées d'un source de SFC, dans l'ordre du fichier.
 *
 * Volontairement sans filtrage : les exceptions assumées sont gérées par
 * l'appelant, qui déclare **combien** d'occurrences il attend. Neutraliser une
 * chaîne pour tout un fichier laisserait passer une nouvelle occurrence
 * illégitime de la même classe.
 */
export function findUnsafeColors(source: string): UnsafeColorHit[] {
  const cleaned = stripComments(source)
  const lines = cleaned.split('\n')
  const hits: UnsafeColorHit[] = []

  lines.forEach((lineText, index) => {
    for (const { name, regex, hint } of UNSAFE_COLOR_PATTERNS) {
      // Les regex sont globales et partagées : réinitialiser avant chaque ligne.
      regex.lastIndex = 0
      for (const match of lineText.matchAll(regex)) {
        hits.push({
          line: index + 1,
          match: match[0],
          pattern: name,
          hint,
          snippet: lineText.trim().slice(0, 120),
        })
      }
    }
  })

  return hits
}

/** Rapport lisible en sortie de test : une ligne par occurrence. */
export function formatUnsafeColors(
  path: string,
  hits: readonly UnsafeColorHit[],
  allow: readonly { pattern: string; count: number; reason: string }[] = []
): string {
  const budgets = new Map(allow.map((e) => [e.pattern, e]))
  const lines = hits.map((h) => {
    const known = budgets.get(h.match)
    const suffix = known ? `  [budget ${known.count} — ${known.reason}]` : ''
    return `  ${path}:${h.line}  ${h.match}  (${h.pattern})${suffix}\n    ${h.snippet}`
  })
  const hints = [...new Set(hits.map((h) => h.hint))].map((h) => `  → ${h}`)
  const overBudget = hits.some((h) => budgets.has(h.match))

  return [
    `${hits.length} couleur(s) figée(s) dans ${path} — elles ne basculeront pas en thème sombre :`,
    ...lines,
    '',
    ...hints,
    '',
    ...(overBudget
      ? [
          'Une de ces classes a déjà une exception, mais elle apparaît plus souvent que son budget :',
          'toutes ses occurrences sont listées ci-dessus, la nouvelle est parmi elles.',
          '',
        ]
      : []),
    "Si l'usage est volontaire (bandeau navy permanent, illustration autonome), déclarez-le dans",
    '`allow` (tests/inertia/theme_safe_components.spec.ts) avec sa raison et son nombre exact',
    "d'occurrences, et commentez-le dans le composant.",
  ].join('\n')
}
