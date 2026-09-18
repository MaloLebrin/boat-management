import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `boat_position_history` : séparer les deux natures de ligne (#722).
 *
 * La table porte deux choses que rien ne distinguait :
 *
 * - un **séjour à quai** (`kind='berth'`) — `spot_id`, écrit par
 *   `BoatHullService._logBerthChange` ;
 * - un **point de position** (`kind='position'`) — `latitude`/`longitude`,
 *   écrit par `BoatPositionService.storeManualPosition`.
 *
 * Les deux employaient la même convention de ligne ouverte (`ended_at is null`)
 * **et le même geste de clôture** (`where boat_id = ? and ended_at is null`).
 * Enregistrer une position GPS clôturait donc le séjour à quai en cours alors
 * que `boats.spot_id` disait toujours le bateau amarré, et réciproquement.
 * `kind` rend la clôture spécifique à sa propre nature.
 *
 * **Backfill** — déterministe : seul `_logBerthChange` écrivait un `spot_id`,
 * et il n'écrivait rien d'autre ; seul `storeManualPosition` écrivait des
 * coordonnées, et jamais de `spot_id`. `spot_id is not null` ⇒ séjour, sinon
 * point de position.
 *
 * **Réparation** — les séjours faussement clos par un point GPS sont rouverts.
 * `boats.spot_id` est la source de vérité de l'amarrage (tous les écrans le
 * lisent) : si un bateau est amarré et que son **dernier** séjour porte cette
 * même place tout en étant clos, la clôture ne peut venir que de la collision
 * ci-dessus — une clôture légitime (démarrage, déplacement, éviction) ouvre
 * toujours une ligne plus récente ou laisse `boats.spot_id` à `null`. Ces
 * lignes sont rouvertes ; la réparation n'est pas rejouable en sens inverse,
 * le `down()` se contente de retirer la colonne.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_position_history'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('kind', 10).nullable()
    })

    // `defer` : l'`alterTable` ci-dessus doit être exécuté avant les UPDATE.
    this.defer(async (db) => {
      await db.from(this.tableName).whereNotNull('spot_id').update({ kind: 'berth' })
      await db.from(this.tableName).whereNull('spot_id').update({ kind: 'position' })

      await db.rawQuery(`
        update boat_position_history as h
        set ended_at = null
        from boats as b
        where h.kind = 'berth'
          and h.ended_at is not null
          and b.id = h.boat_id
          and b.spot_id = h.spot_id
          and h.id = (
            select max(h2.id)
            from boat_position_history as h2
            where h2.boat_id = h.boat_id and h2.kind = 'berth'
          )
      `)
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.string('kind', 10).notNullable().defaultTo('position').alter()
      table.index(['boat_id', 'kind'], 'boat_position_history_boat_id_kind_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['boat_id', 'kind'], 'boat_position_history_boat_id_kind_index')
      table.dropColumn('kind')
    })
  }
}
