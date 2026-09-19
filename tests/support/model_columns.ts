import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODELS_DIR = fileURLToPath(new URL('../../app/models/', import.meta.url))

export interface ModelColumn {
  /** Nom du fichier de modèle, sans extension (`password_reset_token`). */
  model: string
  /** Nom de la propriété déclarée (`token`). */
  property: string
  /** `model.property`, la clé stable utilisée par les allowlists. */
  id: string
  /** La colonne porte-t-elle `serializeAs: null` ? */
  hiddenFromSerialization: boolean
}

/**
 * Recense les colonnes Lucid déclarées dans `app/models/`.
 *
 * Lecture du source plutôt qu'introspection des modèles : importer les 67
 * modèles amorcerait l'application (connexion base comprise) pour un test qui
 * n'a besoin que de la forme du code. Le parcours est volontairement littéral
 * — un décorateur `@column`, ses arguments équilibrés, puis le `declare` qui
 * suit — plutôt qu'une expression régulière unique, que les arguments à
 * parenthèses imbriquées (`prepare: (value) => (…)`) mettent en défaut.
 */
export function readModelColumns(): ModelColumn[] {
  const columns: ModelColumn[] = []

  for (const file of readdirSync(MODELS_DIR)
    .filter((name) => name.endsWith('.ts'))
    .sort()) {
    const model = file.replace(/\.ts$/, '')
    const source = readFileSync(join(MODELS_DIR, file), 'utf-8')
    const decorator = /@column(?:\.[A-Za-z]+)?\s*\(/g

    let match: RegExpExecArray | null
    while ((match = decorator.exec(source)) !== null) {
      const openIndex = match.index + match[0].length - 1
      const closeIndex = findMatchingParen(source, openIndex, `${model}.ts`)
      const args = source.slice(openIndex + 1, closeIndex)

      const declaration = /^\s*declare\s+([A-Za-z0-9_$]+)\s*:/.exec(source.slice(closeIndex + 1))
      if (!declaration) continue

      const property = declaration[1]
      columns.push({
        model,
        property,
        id: `${model}.${property}`,
        hiddenFromSerialization: /serializeAs\s*:\s*null/.test(args),
      })
    }
  }

  return columns
}

/**
 * Index de la parenthèse fermante qui correspond à celle ouverte en
 * `openIndex`, en ignorant les parenthèses à l'intérieur des chaînes.
 */
function findMatchingParen(source: string, openIndex: number, file: string): number {
  let depth = 0
  let quote: string | null = null

  for (let i = openIndex; i < source.length; i++) {
    const char = source[i]

    if (quote !== null) {
      if (char === '\\') i++
      else if (char === quote) quote = null
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }

    if (char === '(') depth++
    else if (char === ')') {
      depth--
      if (depth === 0) return i
    }
  }

  throw new Error(`Unbalanced @column(...) arguments in app/models/${file}`)
}

/**
 * Découpe un nom de propriété camelCase en mots minuscules :
 * `apiKeyEncrypted` → `['api', 'key', 'encrypted']`.
 */
export function propertyWords(property: string): string[] {
  return property
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
}
