# Runbook d'exploitation — sauvegardes et restauration PostgreSQL

Issue #847. La base PostgreSQL est le seul exemplaire de la donnée métier :
carnets d'entretien, historique, réservations, factures, journal d'audit, et les
`cloudinary_public_id` qui relient chaque média à son fichier. Les suppressions
sont physiques et en cascade (pas de soft delete) : une erreur de manipulation,
une migration ratée ou un disque perdu ne se rattrapent que par une sauvegarde.

## 1. Objectifs

| Indicateur | Cible                                                                      |
| ---------- | -------------------------------------------------------------------------- |
| **RPO**    | 24 h au plus : un dump quotidien, plus un dump manuel avant un déploiement |
| **RTO**    | 1 h pour restaurer la base de production depuis le dernier dump            |
| Rétention  | 7 dumps quotidiens, 4 hebdomadaires, 6 mensuels                            |
| Hors site  | Une copie de chaque dump sur un stockage distinct de la machine            |
| Test       | Une restauration vérifiée par trimestre, et à chaque PR en CI              |

## 2. Self-host : le service `backup`

`docker-compose.prod.yml` embarque un service `backup`
(`prodrigestivill/postgres-backup-local:18-alpine`). Il démarre après le
`migrator` et fait :

- **un dump au démarrage**, puis un dump par jour (`SCHEDULE`, `@daily` par
  défaut, fuseau `BACKUP_TZ`, UTC par défaut) ;
- des dumps **SQL gzippés** (`pg_dump -Z6 --no-owner --no-privileges`) : ils se
  restaurent sous n'importe quel rôle, avec les seuls `psql` et `gzip` ;
- une rotation dans le volume `pg_backups` :

  ```
  /backups/last/<base>-AAAAMMJJ-HHMMSS.sql.gz   tous les dumps des dernières 24 h
  /backups/daily/<base>-AAAAMMJJ.sql.gz         7 jours
  /backups/weekly/<base>-AAAASS.sql.gz          4 semaines
  /backups/monthly/<base>-AAAAMM.sql.gz         6 mois
  /backups/*/<base>-latest.sql.gz               lien vers le plus récent
  ```

### Détection des échecs

Le hook `docker/backup/hooks/10-verify-dump` s'exécute après chaque dump. Il
fait échouer la sauvegarde si le fichier :

- manque ;
- pèse moins de 1 Ko ;
- est une archive gzip corrompue ;
- n'a pas le marqueur de fin de `pg_dump` (dump tronqué).

Un échec laisse une ligne `[backup] ERREUR : …` dans les logs du conteneur.

```bash
docker compose -f docker-compose.prod.yml logs --since 48h backup | grep -E "ERREUR|OK :"
```

Pour être alerté plutôt que de lire les logs, décommentez `WEBHOOK_ERROR_URL`
dans le service `backup` et donnez-lui une URL, par exemple un check
healthchecks.io, un webhook Slack ou ntfy. L'image lui envoie un POST à chaque
échec. **Ne laissez pas la variable vide** : le hook webhook de l'image
échouerait alors à chaque sauvegarde. Quand le suivi d'erreurs existera
(#848), c'est là qu'il faudra brancher cette alerte.

### Copie hors machine — obligatoire

Le volume `pg_backups` est sur le même disque que `pg_data` : une perte de
machine emporte la base **et** ses sauvegardes. Une copie hors site fait
partie du déploiement, ce n'est pas une option. Par exemple avec
[rclone](https://rclone.org), configuré une fois (`rclone config`) vers S3,
Backblaze B2 ou un autre fournisseur, et une ligne de crontab sur l'hôte :

```cron
# Tous les jours à 03:30, après le dump de minuit UTC
30 3 * * * docker run --rm -v boat-management_pg_backups:/backups:ro -v /root/.config/rclone:/config/rclone rclone/rclone sync /backups remote:fleetai-backups --exclude "last/**" >> /var/log/fleetai-backup-sync.log 2>&1
```

Le nom du volume est préfixé du nom du projet Compose, qui est par défaut le
dossier du clone : vérifiez-le avec `docker volume ls | grep pg_backups`.
Activez la rétention ou le versioning côté bucket, et donnez au jeton rclone un
droit d'écriture sans suppression si le fournisseur le permet : une machine
compromise ne doit pas pouvoir effacer ses propres sauvegardes.

### Dump manuel avant un déploiement

Une migration destructrice se rattrape plus vite avec un dump d'avant le
déploiement qu'avec celui de la nuit :

```bash
docker compose -f docker-compose.prod.yml exec backup /backup.sh
```

## 3. PaaS : sauvegardes managées

Sur un PaaS, la base est managée par la plateforme et ce service n'existe pas.
Activez les sauvegardes du fournisseur et **vérifiez la rétention réelle**,
qui peut être courte :

- **Fly.io**, **Railway**, **Neon**… : les offres, la rétention par défaut et
  la restauration à un instant donné (PITR) varient selon le fournisseur et le
  plan. Elles changent aussi dans le temps. Vérifiez dans la console de la
  plateforme que les sauvegardes sont **activées**, notez leur **rétention**,
  et reportez-les dans le tableau du § 1. Une fenêtre de quelques heures ne
  couvre pas une erreur découverte le lundi matin.

Dans tous les cas, le test trimestriel du § 5 s'applique aussi : pour exporter
un dump depuis la plateforme, lancez `pg_dump` sur l'URL de la base, puis
exécutez `scripts/db_restore.sh --check`.

## 4. Restaurer

`scripts/db_restore.sh` est monté dans le conteneur `backup` sous le nom
`db_restore`. Il prend un `.sql.gz` (format du service), un `.sql` ou un
`.dump` (`pg_dump -Fc`), vérifie l'archive et le marqueur de fin, puis restaure
en **une seule transaction** avec `ON_ERROR_STOP`. Une erreur à mi-chemin
laisse la base cible vide, pas à moitié remplie. Il vérifie ensuite que la
table des migrations `adonis_schema` est présente et non vide.

### Restaurer la production

1. **Couper les écritures** :

   ```bash
   docker compose -f docker-compose.prod.yml stop web worker worker-ai
   ```

2. **Garder la base actuelle de côté** en la renommant plutôt qu'en la
   supprimant : si la restauration échoue, on peut revenir en arrière.

   ```bash
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U "$DB_USER" -d postgres -c "ALTER DATABASE \"$DB_DATABASE\" RENAME TO \"${DB_DATABASE}_avant_restauration\""
   ```

   Les variables sont celles du `.env`. Chargez-le d'abord (`set -a; . ./.env; set +a`)
   ou remplacez-les à la main.

3. **Restaurer**. Le script crée la base si elle n'existe pas, et **refuse**
   une base qui contient déjà des tables :

   ```bash
   docker compose -f docker-compose.prod.yml exec backup \
     db_restore /backups/daily/<base>-AAAAMMJJ.sql.gz "$DB_DATABASE"
   ```

4. **Vérifier l'alignement avec le code**. Toutes les migrations doivent être
   `completed`. Une migration `pending` signale un dump plus ancien que l'image
   déployée, et le `migrator` l'appliquera au redémarrage.

   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrator node ace migration:status
   ```

5. **Redémarrer**, contrôler `/up`, puis supprimer
   `<base>_avant_restauration` une fois la production validée :

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   curl -f https://<domaine>/up
   ```

Les médias sont sur Cloudinary, hors du dump. Un média envoyé après le dump
restauré existe encore sur Cloudinary, mais plus aucune ligne en base n'y
renvoie. La réconciliation des orphelins de #859 le signale.

### Restaurer depuis la copie hors site

Rapatriez le fichier dans le volume, puis reprenez au § 4 :

```bash
docker run --rm -v boat-management_pg_backups:/backups -v /root/.config/rclone:/config/rclone \
  rclone/rclone copy remote:fleetai-backups/daily/<base>-AAAAMMJJ.sql.gz /backups/restore/
```

## 5. Test de restauration — chaque trimestre

Une sauvegarde jamais restaurée n'est pas une sauvegarde. Le mode `--check`
restaure dans une base jetable, vérifie, puis la supprime, sans toucher à la
production :

```bash
docker compose -f docker-compose.prod.yml exec backup db_restore --check /backups/last/<base>-latest.sql.gz
# [db_restore] OK — 80 tables, 168 migrations, dernière : database/migrations/…
# [db_restore] Test de restauration réussi. La base jetable « restore_check_… » est supprimée.
```

Chaque trimestre, lancez ce contrôle sur un dump **rapatrié depuis la copie
hors site** : c'est elle qui compte le jour où la machine est perdue. Notez
aussi la durée de l'opération : c'est votre RTO réel.

Le job CI `backup-restore` (`.github/workflows/ci.yml`) rejoue la même chaîne
à chaque PR, sur le schéma complet des migrations :

1. dump avec l'image et le hook du service ;
2. `db_restore --check` ;
3. rejet d'un dump tronqué.

Une montée de version de l'image, de PostgreSQL ou du script qui casserait la
restauration échoue donc en CI, et non le jour de l'incident.

## 6. Mettre le site en maintenance

Avant une migration longue ou le temps d'un incident Postgres, les humains
doivent voir « nous revenons dans quelques minutes », pas une 500 générique.
La procédure est dans [`docs/dev/hosting.md`](hosting.md) § 7. En bref :

```bash
docker compose -f docker-compose.prod.yml exec web touch tmp/maintenance
```

La page est un 503 statique (`Retry-After: 300`). **`/up` continue de
répondre** : un orchestrateur qui recycle les instances maladives ne doit pas
tuer le process pendant que vous migrez. Quand la base est vraiment injoignable,
`/up` passe tout seul à 503 — c'est le signal pour la plateforme, distinct de
la page montrée aux visiteurs.

Pour rouvrir :

```bash
docker compose -f docker-compose.prod.yml exec web rm -f tmp/maintenance
```

La variable `MAINTENANCE_MODE=true` fait la même chose, mais seulement après
un redémarrage du process web.

## Hors périmètre

- La sauvegarde des médias Cloudinary, qui a sa propre option de backup. Un bateau
  supprimé reste récupérable 30 jours via la corbeille (#858), sans restaurer la base.
