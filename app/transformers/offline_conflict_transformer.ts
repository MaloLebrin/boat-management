import type Boat from '#models/boat'

/**
 * `conflictData` flashé au rejeu d'une édition hors-ligne en conflit : la ligne
 * du serveur, sérialisée en JSON, et le nom du bateau (#970). Après une longue
 * coupure, la modale liste des conflits de plusieurs bateaux à la fois et les
 * groupe sous ce nom — le client n'a pas la liste des bateaux sous la main.
 */
export function toConflictData(snapshot: object, boat: Pick<Boat, 'name'>): string {
  return JSON.stringify({ ...snapshot, boatName: boat.name })
}
