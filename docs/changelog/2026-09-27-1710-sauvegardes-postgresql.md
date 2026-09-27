# 2026-09-27 — Sauvegardes PostgreSQL et procédure de restauration

Issue #847. Jusqu'ici, le volume `pg_data` était le seul exemplaire des données. Une perte de disque, une migration ratée ou une suppression en cascade étaient irréversibles.

- **Service `backup`** dans `docker-compose.prod.yml` (`prodrigestivill/postgres-backup-local:18-alpine`) :
  - Il démarre après le `migrator`, prend un dump au démarrage, puis un par jour (`BACKUP_SCHEDULE`, défaut `@daily`, fuseau `BACKUP_TZ`, défaut UTC).
  - Les dumps sont en SQL gzippé, sans propriétaire ni droits (`-Z6 --no-owner --no-privileges`), dans le nouveau volume `pg_backups`.
  - Rotation : 7 dumps quotidiens, 4 hebdomadaires, 6 mensuels.
  - `.env.example` gagne `BACKUP_SCHEDULE` et `BACKUP_TZ`.
- **Détection des échecs.** Le hook `docker/backup/hooks/10-verify-dump` s'exécute après chaque dump. Il fait échouer la sauvegarde, avec `[backup] ERREUR` dans les logs, si le fichier manque, pèse moins de 1 Ko, est une archive gzip corrompue, ou n'a pas le marqueur de fin de `pg_dump` (dump tronqué). Pour recevoir un POST à chaque échec, décommentez `WEBHOOK_ERROR_URL` dans le service.
- **`scripts/db_restore.sh`**, monté dans le conteneur `backup` sous le nom `db_restore` :
  - Formats acceptés : `.sql.gz`, `.sql` ou `.dump`.
  - Contrôles préalables : archive, marqueur de fin.
  - Restauration en une seule transaction avec `ON_ERROR_STOP`. Le script refuse une base cible qui contient déjà des tables.
  - Contrôle final : `adonis_schema` doit être présente et non vide.
  - `--check` restaure dans une base jetable puis la supprime. C'est le test de restauration.
- **CI.** Un nouveau job `backup-restore` migre une base PostgreSQL 18 puis la sauvegarde avec l'image et le hook du service. Il la restaure ensuite avec `db_restore --check` et vérifie qu'un dump tronqué est refusé.
- **Docs.**
  - Nouveau `docs/dev/runbook.md` : RPO 24 h, RTO 1 h, rétention, copie hors site obligatoire (exemple rclone), alertes, restauration pas à pas avec `migration:status`, test trimestriel, PaaS.
  - Le runbook est lié depuis `docs/dev/hosting.md` (§ 4 et § 5), `docs/README.md` et `README.md`.
- **Pas de changement applicatif**, donc pas d'entrée dans la base de connaissance du copilote : il s'agit d'exploitation, sans écran ni comportement visible dans l'app.
- **Découvert en testant :** l'image `postgres:18` refuse le montage de `pg_data` sur `/var/lib/postgresql/data`, si bien que le compose de prod ne démarre pas. Le correctif est suivi dans #908, hors de cette PR.
