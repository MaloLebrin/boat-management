import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'

/**
 * Promesses fonctionnelles du site (#866).
 *
 * Le site a longtemps vendu des fonctionnalités jamais codées : SSO/SCIM,
 * assignation et glisser-déposer au planning, rapports automatiques, import
 * Google Sheets/Airtable, API publique, app native, « 90 jours pour exporter »
 * alors que Starter bloque l'export CSV. Ce garde-fou relit `marketing.json`
 * dans les deux locales : une formulation retirée ne revient pas sans que
 * quelqu'un ait d'abord livré la fonctionnalité et levé la ligne ici.
 */

const FORBIDDEN: Record<'fr' | 'en', RegExp[]> = {
  fr: [
    /\bSSO\b/,
    /\bSCIM\b/,
    /\bSAML\b/,
    /Google Sheets/,
    /Airtable/,
    /glisser-déposer/i,
    /réassign/i,
    /assignation/i,
    /rapport (hebdomadaire|mensuel)/i,
    /API (publique|custom)/i,
    /app mobile (complète|iOS)/i,
    /granulaires/i,
    /partageable avec les moniteurs/i,
    /90 jours (après l'arrêt|pour exporter)/i,
  ],
  en: [
    /\bSSO\b/,
    /\bSCIM\b/,
    /\bSAML\b/,
    /Google Sheets/,
    /Airtable/,
    /drag-and-drop reassignment/i,
    /team assignment/i,
    /(weekly|monthly) report/i,
    /(public|custom) API/i,
    /full mobile app/i,
    /iOS \/ Android/i,
    /granular roles/i,
    /shareable boat status/i,
    /90 days (after cancellation|to export)/i,
  ],
}

/** Toutes les chaînes du namespace, avec leur chemin de clé. */
function flatten(node: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof node === 'string') return [[path.join('.'), node]]
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => flatten(v, [...path, k]))
  }
  return []
}

test.group('Marketing — aucune promesse sans fonctionnalité (#866)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] marketing.json ne promet rien que le produit ne tient pas`, ({ assert }) => {
      const file = new URL(`../../../resources/lang/${locale}/marketing.json`, import.meta.url)
      const strings = flatten(JSON.parse(readFileSync(file, 'utf8')))

      const offenders = strings.flatMap(([key, value]) =>
        FORBIDDEN[locale].filter((re) => re.test(value)).map((re) => `${key} ~ ${re}`)
      )

      assert.deepEqual(offenders, [])
    })
  }
})
