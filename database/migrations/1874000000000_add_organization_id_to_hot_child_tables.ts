import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `organization_id` dénormalisé sur les tables enfants chaudes qui n'en
 * avaient pas (#855).
 *
 * Les pleins (`boat_fuel_logs`) et les incidents (`boat_incidents`) portent
 * déjà la colonne. Les tâches, l'historique de maintenance et les médias
 * n'étaient joignables que par `boat_id` (ou, pour un média, par le couple
 * polymorphe `entity_type` / `entity_id`). Un filtre direct prépare une
 * future RLS ; il ne la remplace pas — voir `docs/architecture/multi-tenant.md`.
 *
 * Tâches et événements : NOT NULL après reprise depuis le bateau.
 * Médias : nullable, parce qu'un avatar (`entity_type = 'user'`) peut
 * appartenir à un compte sans organisation.
 */
export default class extends BaseSchema {
  async up() {
    this.#addOrganizationColumn('boat_maintenance_events')
    this.#addOrganizationColumn('boat_maintenance_tasks')
    this.#addOrganizationColumn('media')

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE boat_maintenance_events AS e
        SET organization_id = b.organization_id
        FROM boats AS b
        WHERE e.boat_id = b.id
          AND e.organization_id IS NULL
      `)
      await db.rawQuery(`
        UPDATE boat_maintenance_tasks AS t
        SET organization_id = b.organization_id
        FROM boats AS b
        WHERE t.boat_id = b.id
          AND t.organization_id IS NULL
      `)
      await db.rawQuery(`
        ALTER TABLE boat_maintenance_events
        ALTER COLUMN organization_id SET NOT NULL
      `)
      await db.rawQuery(`
        ALTER TABLE boat_maintenance_tasks
        ALTER COLUMN organization_id SET NOT NULL
      `)

      await this.#backfillMedia(db)
    })
  }

  async down() {
    this.#dropOrganizationColumn('media')
    this.#dropOrganizationColumn('boat_maintenance_tasks')
    this.#dropOrganizationColumn('boat_maintenance_events')
  }

  #addOrganizationColumn(tableName: string) {
    this.schema.alterTable(tableName, (table) => {
      table
        .integer('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
        .index()
    })
  }

  #dropOrganizationColumn(tableName: string) {
    this.schema.alterTable(tableName, (table) => {
      table.dropIndex(['organization_id'])
      table.dropColumn('organization_id')
    })
  }

  /**
   * Reprend l'organisation depuis l'entité pointée. Une ligne dont l'entité
   * a disparu reste `NULL` : le filtre `organization_id = ?` ne la renverra
   * à personne.
   */
  async #backfillMedia(db: { rawQuery: (sql: string) => Promise<unknown> }) {
    const fromBoat = (entityType: string, tableName: string) =>
      db.rawQuery(`
        UPDATE media AS m
        SET organization_id = b.organization_id
        FROM ${tableName} AS child
        JOIN boats AS b ON b.id = child.boat_id
        WHERE m.organization_id IS NULL
          AND m.entity_type = '${entityType}'
          AND m.entity_id = child.id
      `)

    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = b.organization_id
      FROM boats AS b
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'boat'
        AND m.entity_id = b.id
    `)
    await fromBoat('boat_engine', 'boat_engines')
    await fromBoat('boat_sail', 'boat_sails')
    await fromBoat('boat_rig', 'boat_rigs')
    await fromBoat('boat_generic_equipment', 'boat_generic_equipment')
    await fromBoat('boat_safety_equipment', 'boat_safety_equipment')
    await fromBoat('boat_maintenance_event', 'boat_maintenance_events')
    await fromBoat('boat_document', 'boat_documents')

    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = b.organization_id
      FROM boat_engine_parts AS p
      JOIN boat_engines AS e ON e.id = p.boat_engine_id
      JOIN boats AS b ON b.id = e.boat_id
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'boat_engine_part'
        AND m.entity_id = p.id
    `)
    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = i.organization_id
      FROM boat_incidents AS i
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'boat_incident'
        AND m.entity_id = i.id
    `)
    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = i.organization_id
      FROM boat_inspections AS i
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'inspection'
        AND m.entity_id = i.id
    `)
    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = c.organization_id
      FROM rental_contracts AS c
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'rentalContract'
        AND m.entity_id = c.id
    `)
    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = c.organization_id
      FROM clients AS c
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'client'
        AND m.entity_id = c.id
    `)
    await db.rawQuery(`
      UPDATE media AS m
      SET organization_id = u.organization_id
      FROM users AS u
      WHERE m.organization_id IS NULL
        AND m.entity_type = 'user'
        AND m.entity_id = u.id
        AND u.organization_id IS NOT NULL
    `)
  }
}
