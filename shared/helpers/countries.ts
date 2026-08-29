/**
 * Rendu et normalisation d'un pays (#580).
 *
 * Symétrique de `date_format` : l'interdit n'est pas `Intl`, c'est la locale
 * **implicite**. Un nom de pays se rend toujours dans la locale de l'app —
 * celle de `useT()` côté Inertia, `i18n.locale` côté backend — jamais celle du
 * navigateur, sinon une session EN sur une machine française lit « Allemagne »
 * au milieu d'une page anglaise.
 *
 * Les libellés viennent d'ICU plutôt que de 249 × 2 clés i18n à maintenir.
 */

import { COUNTRY_ALPHA3, COUNTRY_CODES, isCountryCode } from '../constants/countries.js'
import type { CountryCode } from '../constants/countries.js'
import { resolveLocaleTag } from './date_format.js'

/**
 * Nom du pays dans la locale demandée, avec **repli sur la valeur brute**.
 *
 * Le repli n'est pas décoratif : la migration de normalisation conserve les
 * valeurs qu'elle n'a pas su mapper, et un vieux pavillon `Bretagne` doit
 * continuer à s'afficher tel quel plutôt que de disparaître. On teste
 * l'appartenance à la liste **avant** d'appeler ICU, parce que `Intl` est
 * hostile aux deux bords : `.of('FRANCE')` lève un `RangeError` et `.of('ZZ')`
 * rend un « région inconnue » qui serait pire que la valeur d'origine.
 */
export function countryName(code: string | null | undefined, locale?: string | null): string {
  const raw = String(code ?? '').trim()
  if (raw === '') return ''
  if (!isCountryCode(raw)) return raw

  try {
    return new Intl.DisplayNames([resolveLocaleTag(locale)], { type: 'region' }).of(raw) ?? raw
  } catch {
    return raw
  }
}

/**
 * Réduit une saisie à sa forme comparable : sans accents, sans ponctuation,
 * en majuscules. `« Îles Féroé »`, `« iles feroe »` et `« ILES-FEROE »`
 * convergent donc vers la même clé.
 */
function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
}

/**
 * Alias que la norme ne couvre pas mais qu'on trouve en base ou sous les
 * doigts d'un utilisateur. `UK` est une réservation exceptionnelle ISO (donc
 * absente de `COUNTRY_CODES`), les autres sont des usages courants.
 */
const COUNTRY_ALIASES: Readonly<Record<string, CountryCode>> = {
  'UK': 'GB',
  'ANGLETERRE': 'GB',
  'ENGLAND': 'GB',
  'GRANDE BRETAGNE': 'GB',
  'GREAT BRITAIN': 'GB',
  'USA': 'US',
  'ETATS UNIS': 'US',
  'ETATS UNIS D AMERIQUE': 'US',
  'UAE': 'AE',
  'HOLLANDE': 'NL',
  'PAYS BAS': 'NL',
  'HOLLAND': 'NL',
  'DEUTSCHLAND': 'DE',
  'ESPANA': 'ES',
  'ITALIA': 'IT',
  'SUISSE': 'CH',
  'SCHWEIZ': 'CH',
  'BELGIQUE': 'BE',
  'PORTUGAL': 'PT',
}

/**
 * Index inverse « nom normalisé → code », construit à la demande depuis ICU
 * pour les deux locales de l'app. Le construire paresseusement évite de payer
 * 249 × 2 appels `Intl` au chargement du module côté client, où seule
 * `countryName()` sert.
 */
let reverseIndex: Map<string, CountryCode> | null = null

function getReverseIndex(): Map<string, CountryCode> {
  if (reverseIndex) return reverseIndex

  const index = new Map<string, CountryCode>()
  for (const tag of ['fr-FR', 'en-US']) {
    let display: Intl.DisplayNames
    try {
      display = new Intl.DisplayNames([tag], { type: 'region' })
    } catch {
      continue
    }

    for (const code of COUNTRY_CODES) {
      let label: string | undefined
      try {
        label = display.of(code)
      } catch {
        continue
      }
      if (!label || label === code) continue

      // `fr` est indexé en premier et ne doit pas être écrasé par `en` : les
      // deux locales partagent des libellés (« Monaco », « Malta »/« Malte »),
      // le premier arrivé fait foi puisqu'ils désignent le même pays.
      const key = normalizeLabel(label)
      if (!index.has(key)) index.set(key, code)
    }
  }

  reverseIndex = index
  return index
}

/**
 * Normalisation best-effort d'une valeur libre vers un code alpha-2.
 *
 * Rend `null` quand rien ne colle — l'appelant (la migration #580) conserve
 * alors la valeur d'origine plutôt que de deviner. On ne perd aucune donnée :
 * ce qui n'est pas reconnu reste en base et continue de s'afficher via le
 * repli de `countryName()`.
 */
export function normalizeCountryCode(raw: string | null | undefined): CountryCode | null {
  const value = normalizeLabel(String(raw ?? ''))
  if (value === '') return null

  // 1. déjà un alpha-2 de la norme (`fr`, `FR`, ` fr `)
  if (isCountryCode(value)) return value

  // 2. alias hors norme et usages courants, avant ICU : `UK` doit rendre `GB`
  //    et non le `UK` qu'ICU sait pourtant résoudre.
  const alias = COUNTRY_ALIASES[value]
  if (alias) return alias

  // 3. alpha-3 (`FRA`, `GBR`)
  const fromAlpha3 = COUNTRY_ALPHA3[value]
  if (fromAlpha3) return fromAlpha3

  // 4. nom du pays, dans l'une ou l'autre locale de l'app
  return getReverseIndex().get(value) ?? null
}
