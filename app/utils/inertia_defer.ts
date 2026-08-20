import type { UnPackedPageProps } from '@adonisjs/inertia/types'

/**
 * `inertia.defer()` contraint son callback à `UnPackedPageProps`, un type
 * structurel qui exige une index signature. TypeScript ne l'accorde pas
 * implicitement aux **interfaces** nommées (`BoatDocumentRow`,
 * `NavigationLogRow`, `CrewMemberOption`…), alors que le JSON produit est
 * strictement le même que pour un objet inféré.
 *
 * Ce wrapper évite d'avoir à transformer nos interfaces en alias de type
 * (cf. CLAUDE.md : « interfaces préférées aux types pour les objets ») juste
 * pour satisfaire la contrainte de l'adaptateur.
 *
 * ⚠️ Le callback ne doit jamais résoudre `null` : au rechargement partiel du
 * groupe différé, l'InertiaSerializer (`@adonisjs/http-transformers`) jette
 * « Cannot serialize an item with null value » sur toute valeur `null`
 * retournée par un prop-fonction — la page répond alors 500 (#478). Porter
 * l'absence de donnée par `[]` ou un objet, pas par `null`.
 *
 * @example
 * boatDocuments: inertia.defer(deferJson(() => this.documentService.listForBoat(user, boat)), 'maintenance')
 */
export function deferJson<T>(fn: () => T | Promise<T>): () => Promise<UnPackedPageProps> {
  return async () => (await fn()) as unknown as UnPackedPageProps
}
