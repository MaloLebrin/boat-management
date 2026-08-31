import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import {
  ALL_MAINTENANCE_SHEET_ITEM_KEYS,
  MAINTENANCE_SHEET_TEMPLATE_LIST,
  MAINTENANCE_SHEET_TEMPLATES,
} from '../../shared/constants/maintenance/maintenance_sheet_content'
import { SHEET_TYPES } from '../../shared/types/maintenance'

function flattenKeys(node: unknown, prefix: string): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

function localeJson(locale: 'en' | 'fr'): Record<string, unknown> {
  const raw = readFileSync(join(process.cwd(), 'resources', 'lang', locale, 'maintenance.json'))
  return JSON.parse(raw.toString())
}

function localeKeys(locale: 'en' | 'fr'): Set<string> {
  return new Set(flattenKeys(localeJson(locale), 'maintenance'))
}

/** Résout une clé `maintenance.…` dans le JSON d'une locale. */
function resolve(doc: Record<string, unknown>, key: string): string {
  let node: unknown = doc
  for (const segment of key.replace(/^maintenance\./, '').split('.')) {
    node = (node as Record<string, unknown>)[segment]
  }
  return node as string
}

/**
 * Libellés FR du gabarit d'origine (les 56 items d'avant #583), verbatim.
 * Le corpus doit les reproduire **à l'identique et dans le même ordre** : ces
 * items sont déjà connus des utilisateurs et le passage aux clés stables ne
 * devait pas en changer un seul.
 */
const LEGACY_FR_TEMPLATES: Record<string, string[]> = {
  entretien: [
    'Inspection visuelle de la coque',
    'Vérification et remplacement des anodes',
    'Contrôle du safran et axe de gouvernail',
    'Inspection du moteur (niveaux, filtres, courroies)',
    'Vérification du circuit électrique',
    'Contrôle des instruments de navigation',
    "Inspection de l'accastillage",
    'Vérification des équipements de sécurité',
    'Contrôle du gréement dormant',
    'Nettoyage général',
  ],
  montage: [
    'Vérification du mât et barres de flèche',
    'Inspection des haubans et étais',
    'Montage et réglage du gréement dormant',
    'Installation et orientation des voiles',
    'Réglage du gréement courant',
    'Vérification des bloqueurs et poulies',
    'Test des winches',
    'Contrôle des têtes de mât et instruments',
    'Vérification du pataras et étai de trinquette',
    'Test de navigation courte',
  ],
  hivernage: [
    "Sortie de l'eau et nettoyage de la coque",
    'Traitement antifouling',
    'Vérification et remplacement des anodes',
    'Vidange et rinçage du moteur',
    'Antigel du circuit de refroidissement',
    'Traitement du carburant (stabilisateur)',
    'Décharge contrôlée et stockage des batteries',
    'Démontage et rangement des voiles',
    'Démontage du gréement courant',
    'Protection des cordages et poulies',
    'Fermeture des vannes de coque',
    "Mise hors tension et rangement de l'électronique",
    'Ventilation du bateau',
    'Pose de la bâche de protection',
  ],
  dehivernage: [
    'Inspection générale de la coque',
    'Vérification des passe-coques et vannes',
    'Contrôle du safran et du gouvernail',
    'Remise en charge des batteries',
    'Révision du moteur (huile, filtres, courroies)',
    'Test du circuit de refroidissement',
    'Vérification du circuit électrique',
    'Montage des voiles',
    'Vérification du gréement dormant',
    'Vérification du gréement courant',
    'Test des instruments de navigation',
    'Test de la VHF et de la radio',
    "Vérification de l'armement de sécurité",
    'Essai en mer',
  ],
  atelier: [
    'Diagnostic initial',
    'Préparation du poste de travail',
    'Dépose des pièces concernées',
    'Réparation / remplacement des pièces',
    'Tests et contrôles',
    'Remontage et ajustements',
    'Nettoyage du poste de travail',
    'Compte-rendu des travaux effectués',
  ],
}

describe('Corpus des fiches de maintenance (#583)', () => {
  test('la liste couvre exactement SHEET_TYPES, dans l’ordre', () => {
    expect(MAINTENANCE_SHEET_TEMPLATE_LIST.map((template) => template.type)).toEqual([
      ...SHEET_TYPES,
    ])
    for (const type of SHEET_TYPES) {
      expect(MAINTENANCE_SHEET_TEMPLATES[type].type).toBe(type)
    }
  })

  test('chaque fiche a au moins un item, préfixé par son type', () => {
    for (const template of MAINTENANCE_SHEET_TEMPLATE_LIST) {
      expect(template.items.length).toBeGreaterThan(0)
      for (const entry of template.items) {
        expect(entry.key.startsWith(`${template.type}.`)).toBe(true)
        expect(entry.labelKey).toBe(
          `maintenance.sheets.${template.type}.items.${entry.key.slice(template.type.length + 1)}`
        )
      }
    }
  })

  test('les clés persistables sont uniques et indexées', () => {
    const itemCount = MAINTENANCE_SHEET_TEMPLATE_LIST.reduce(
      (sum, template) => sum + template.items.length,
      0
    )
    expect(ALL_MAINTENANCE_SHEET_ITEM_KEYS.size).toBe(itemCount)
  })

  test('toute clé i18n du corpus existe dans les deux locales', () => {
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    for (const template of MAINTENANCE_SHEET_TEMPLATE_LIST) {
      const keys = [template.labelKey, ...template.items.map((entry) => entry.labelKey)]
      for (const key of keys) {
        expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
        expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
      }
    }
  })

  test('les 56 items historiques sont migrés à l’identique (libellés FR, découpage, ordre)', () => {
    const fr = localeJson('fr')

    for (const [type, labels] of Object.entries(LEGACY_FR_TEMPLATES)) {
      const template = MAINTENANCE_SHEET_TEMPLATES[type as keyof typeof MAINTENANCE_SHEET_TEMPLATES]
      expect(
        template.items.map((entry) => resolve(fr, entry.labelKey)),
        `fiche ${type}`
      ).toEqual(labels)
    }

    const legacyCount = Object.values(LEGACY_FR_TEMPLATES).reduce((sum, l) => sum + l.length, 0)
    expect(legacyCount).toBe(56)
  })

  test('les quatre nouveaux types (#583) sont livrés', () => {
    expect(MAINTENANCE_SHEET_TEMPLATES.moteur_saison.items.length).toBeGreaterThan(0)
    expect(MAINTENANCE_SHEET_TEMPLATES.carenage.items.length).toBeGreaterThan(0)
    expect(MAINTENANCE_SHEET_TEMPLATES.catamaran.items.length).toBeGreaterThan(0)
    expect(MAINTENANCE_SHEET_TEMPLATES.semi_rigide.items.length).toBeGreaterThan(0)
  })

  test('exemples de contenu attendus par l’issue sur les nouveaux types', () => {
    const keys = ALL_MAINTENANCE_SHEET_ITEM_KEYS
    // moteur_saison : turbine, anodes, filtres, batterie, essai
    expect(keys.has('moteur_saison.impeller_check')).toBe(true)
    expect(keys.has('moteur_saison.engine_test_run')).toBe(true)
    // carenage : antifouling et remise à l'eau
    expect(keys.has('carenage.antifouling_application')).toBe(true)
    expect(keys.has('carenage.relaunch')).toBe(true)
    // catamaran : deux lignes moteur et trampoline
    expect(keys.has('catamaran.port_engine_line_check')).toBe(true)
    expect(keys.has('catamaran.starboard_engine_line_check')).toBe(true)
    expect(keys.has('catamaran.trampoline_check')).toBe(true)
    // semi_rigide : flotteurs et remorque
    expect(keys.has('semi_rigide.tubes_pressure_check')).toBe(true)
    expect(keys.has('semi_rigide.trailer_check')).toBe(true)
  })
})
