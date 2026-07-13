import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * `boat_engines.hours` is the live cumulative running-hours counter driving
 * preventive maintenance thresholds (badges, planning, dashboard, AI
 * analyses). Every application write path is already monotonic by
 * construction (create() only, incrementHours() adds a positive delta,
 * navigation log closure only raises the value) — this trigger is a
 * database-level backstop against a future regression bug or manual
 * tampering, since a CHECK constraint alone cannot compare against the
 * previous row value.
 */
export default class extends BaseSchema {
  protected tableName = 'boat_engines'
  protected functionName = 'boat_engines_prevent_hours_decrease'
  protected triggerName = 'boat_engines_hours_monotonic'

  async up() {
    this.schema.raw(`
      CREATE OR REPLACE FUNCTION ${this.functionName}()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.hours IS NOT NULL AND OLD.hours IS NOT NULL AND NEW.hours < OLD.hours THEN
          RAISE EXCEPTION 'boat_engines.hours cannot decrease (id=%, current=%, attempted=%)',
            OLD.id, OLD.hours, NEW.hours;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    this.schema.raw(`
      CREATE TRIGGER ${this.triggerName}
      BEFORE UPDATE ON "${this.tableName}"
      FOR EACH ROW
      EXECUTE FUNCTION ${this.functionName}();
    `)
  }

  async down() {
    this.schema.raw(`DROP TRIGGER IF EXISTS ${this.triggerName} ON "${this.tableName}"`)
    this.schema.raw(`DROP FUNCTION IF EXISTS ${this.functionName}()`)
  }
}
