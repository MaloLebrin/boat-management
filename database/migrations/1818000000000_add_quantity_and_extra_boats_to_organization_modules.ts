import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Add-on quantitatif « bateaux supplémentaires » (épic #333). On généralise la
 * table `organization_modules` pour porter aussi des add-ons quantitatifs :
 * - colonne `quantity` (défaut 1) : nombre d'unités de l'add-on (ignoré pour
 *   les modules booléens, qui restent à 1) ;
 * - le CHECK sur `module` accepte désormais la valeur `extra_boats`.
 * La contrainte `unique(organization_id, module)` est conservée : une seule
 * ligne par add-on, la quantité encode le nombre acheté.
 */
export default class extends BaseSchema {
  protected tableName = 'organization_modules'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('quantity').notNullable().defaultTo(1)
    })

    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_module_check"`
    )
    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_module_check"
      CHECK (module IN ('charter','crm_invoicing','extra_boats'))
    `)
  }

  async down() {
    // Retire toute ligne d'add-on avant de restreindre à nouveau le CHECK.
    this.schema.raw(
      `DELETE FROM "${this.tableName}" WHERE module NOT IN ('charter','crm_invoicing')`
    )

    this.schema.raw(
      `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "${this.tableName}_module_check"`
    )
    this.schema.raw(`
      ALTER TABLE "${this.tableName}"
      ADD CONSTRAINT "${this.tableName}_module_check"
      CHECK (module IN ('charter','crm_invoicing'))
    `)

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('quantity')
    })
  }
}
