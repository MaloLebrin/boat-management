import { DateTime } from 'luxon'

/**
 * Caractères qui, en tête de cellule, font qu'un tableur interprète la valeur
 * comme une formule plutôt que comme du texte (CWE-1236).
 *
 * `=` et `@` ouvrent une formule, `+` et `-` aussi chez Excel, et TAB/CR sont
 * absorbés par l'analyseur avant que le caractère suivant ne soit lu.
 */
const FORMULA_LEAD_CHARS = new Set(['=', '+', '-', '@', '\t', '\r'])

/**
 * Un littéral numérique ne peut pas être une formule : `-42` et `-1 234,50`
 * doivent rester des nombres exploitables dans le tableur.
 *
 * L'ancrage est ce qui rend l'exemption sûre — `-1+1` ne matche pas, et se
 * fait donc neutraliser comme il se doit.
 */
const NUMERIC_LITERAL = /^-?\d+(?:[.,]\d+)?$/

function isFormulaRisk(value: string): boolean {
  if (value.length === 0) return false
  if (!FORMULA_LEAD_CHARS.has(value[0])) return false
  return !NUMERIC_LITERAL.test(value)
}

/**
 * Échappement RFC 4180 **et** neutralisation des formules (#773).
 *
 * L'apostrophe de tête est la contre-mesure recommandée par l'OWASP : le
 * tableur la consomme comme marqueur « ceci est du texte » et n'affiche pas
 * la formule. Elle n'est posée que sur les **chaînes** — un `number` passé
 * tel quel n'est jamais préfixé, sinon tout l'export devient du texte et les
 * colonnes de coûts cessent d'être sommables.
 */
export function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return String(value)

  const str = value
  if (isFormulaRisk(str)) {
    // Guillemets **en plus** de l'apostrophe : la valeur peut aussi contenir
    // un `;` ou un saut de ligne.
    return `"'${str.replace(/"/g, '""')}"`
  }
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Construit un CSV point-virgule avec BOM UTF-8.
 *
 * **Le seul constructeur de CSV du repo.** Il y en avait deux, avec deux
 * échappements divergents : corriger la règle à deux endroits garantissait
 * qu'on la recasserait à un seul (#773).
 */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Buffer {
  const BOM = '﻿'
  const lines = [headers.map(escapeCell).join(';'), ...rows.map((r) => r.map(escapeCell).join(';'))]
  return Buffer.from(BOM + lines.join('\r\n'), 'utf-8')
}

export function csvFilename(base: string, boatName: string): string {
  const safe = boatName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return `${base}_${safe}_${DateTime.now().toISODate()}.csv`
}
