import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

/**
 * PostgreSQL n'indexe pas automatiquement les colonnes de clé étrangère.
 * Toute FK publique doit avoir au moins un index (simple ou composite)
 * qui couvre la colonne — voir #857 et `docs/dev/contributing.md`.
 */
test.group('Foreign key indexes (#857)', () => {
  test('chaque colonne de clé étrangère publique est couverte par un index', async ({ assert }) => {
    const result = await db.rawQuery(`
      select c.conrelid::regclass::text as table_name, a.attname as column_name
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.contype = 'f'
        and c.connamespace = 'public'::regnamespace
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
        )
      order by 1, 2
    `)

    const missing = (result.rows as Array<{ table_name: string; column_name: string }>).map(
      (row) => `${row.table_name}.${row.column_name}`
    )

    assert.deepEqual(
      missing,
      [],
      `FK sans index : ${missing.join(', ')} — ajouter un index dans une nouvelle migration`
    )
  })
})
