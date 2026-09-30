# 2026-09-30 — Index btree sur les clés étrangères sans index (#857)

PostgreSQL ne crée pas d'index sur la colonne référençante d'une FK. Un
relevé sur la base migrée montrait 48 colonnes FK sans index : jointures,
filtres et `ON DELETE CASCADE` / `SET NULL` faisaient un scan séquentiel de
la table enfant (suppression d'un utilisateur ou d'un port, historique de
maintenance par voile/gréement, etc.).

- **Correctif.** Migration `1876000000000_add_missing_fk_indexes` : un index
  btree nommé `{table}_{column}_idx` par colonne listée, `down()`
  symétrique. Tables encore petites : index classiques dans la transaction,
  pas `CREATE INDEX CONCURRENTLY`.
- **Garde.** Test d'intégration `tests/integration/db/fk_indexes.spec.ts` :
  la requête `pg_constraint` / `pg_index` du schéma `public` doit renvoyer
  zéro ligne.
- **Docs.** Règle dans `docs/dev/contributing.md` ; mentions « indexé » et
  paragraphe d'intro dans `docs/data/schema.md`.
