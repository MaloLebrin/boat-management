#!/usr/bin/env bash
# Restauration d'une sauvegarde PostgreSQL (#847) — voir docs/dev/runbook.md.
#
#   db_restore.sh --check <dump>        restaure dans une base jetable, vérifie, supprime
#   db_restore.sh <dump> <base cible>   restaure dans une base vide (créée si absente)
#
# <dump> : `.sql.gz` (format du service `backup`), `.sql` ou `.dump` (pg_dump -Fc).
#
# Connexion : variables libpq (PGHOST, PGPORT, PGUSER, PGPASSWORD), à défaut
# POSTGRES_* (service `backup` du compose), à défaut DB_* (`.env` de l'app).
# La base de maintenance utilisée pour CREATE/DROP DATABASE est `postgres`.
#
# La restauration se fait en une seule transaction avec ON_ERROR_STOP : une
# erreur à mi-chemin laisse la base cible vide, pas à moitié remplie.
set -Eeuo pipefail

export PGHOST="${PGHOST:-${POSTGRES_HOST:-${DB_HOST:-localhost}}}"
export PGPORT="${PGPORT:-${POSTGRES_PORT:-${DB_PORT:-5432}}}"
export PGUSER="${PGUSER:-${POSTGRES_USER:-${DB_USER:-}}}"
export PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-${DB_PASSWORD:-}}}"
MAINTENANCE_DB="${MAINTENANCE_DB:-postgres}"

usage() {
  sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

log() { echo "[db_restore] $*"; }
fail() {
  echo "[db_restore] ERREUR : $*" >&2
  exit 1
}

psql_maint() { psql -X -v ON_ERROR_STOP=1 -q -At -d "$MAINTENANCE_DB" "$@"; }
psql_db() {
  local db="$1"
  shift
  psql -X -v ON_ERROR_STOP=1 -q -At -d "$db" "$@"
}

# Identifiant SQL entre guillemets (le nom de base vient de la ligne de commande).
quote_ident() { printf '"%s"' "${1//\"/\"\"}"; }

# Requête lue sur stdin : psql n'interpole pas `:'name'` dans un `-c`.
db_exists() {
  [ "$(psql_maint -v name="$1" <<<"select 1 from pg_database where datname = :'name'")" = "1" ]
}

public_table_count() {
  psql_db "$1" -c "select count(*) from pg_tables where schemaname = 'public'"
}

restore_into() {
  local dump="$1" db="$2"
  log "Restauration de $dump dans « $db »…"
  case "$dump" in
    *.sql.gz) gzip -dc -- "$dump" | psql_db "$db" --single-transaction >/dev/null ;;
    *.sql) psql_db "$db" --single-transaction -f "$dump" >/dev/null ;;
    *.dump) pg_restore --exit-on-error --single-transaction --no-owner --no-privileges -d "$db" -- "$dump" ;;
    *) fail "extension non reconnue : $dump (.sql.gz, .sql ou .dump attendu)" ;;
  esac
}

# Contrôles après restauration : la table des migrations Adonis doit exister et
# être non vide — c'est elle que `node ace migration:status` compare au code.
verify() {
  local db="$1" tables migrations last
  tables="$(public_table_count "$db")"
  [ "$tables" -gt 0 ] || fail "aucune table dans le schéma public de « $db »"
  migrations="$(psql_db "$db" -c "select count(*) from adonis_schema")" ||
    fail "table adonis_schema absente : le dump ne vient pas de cette application"
  [ "$migrations" -gt 0 ] || fail "adonis_schema est vide"
  last="$(psql_db "$db" -c "select name from adonis_schema order by id desc limit 1")"
  log "OK — $tables tables, $migrations migrations, dernière : $last"
}

main() {
  command -v psql >/dev/null || fail "psql introuvable"
  [ -n "$PGUSER" ] || fail "utilisateur PostgreSQL inconnu (PGUSER, POSTGRES_USER ou DB_USER)"

  local check=0
  if [ "${1:-}" = "--check" ]; then
    check=1
    shift
  fi
  [ $# -ge 1 ] || usage

  # `readlink -f` suit le lien `*-latest.sql.gz` du service backup.
  local dump
  dump="$(readlink -f -- "$1")" || fail "fichier introuvable : $1"
  [ -f "$dump" ] || fail "fichier introuvable : $1"
  [ -s "$dump" ] || fail "fichier vide : $dump"
  # pg_dump termine un dump SQL par ce commentaire : sans lui, le fichier est
  # tronqué et psql en rejouerait sans erreur le début (schéma sans données).
  local tail_lines=""
  case "$dump" in
    *.sql.gz)
      gzip -t -- "$dump" || fail "archive gzip corrompue : $dump"
      tail_lines="$(gzip -dc -- "$dump" | tail -n 5)"
      ;;
    *.sql) tail_lines="$(tail -n 5 -- "$dump")" ;;
  esac
  case "$dump" in
    *.sql.gz | *.sql)
      grep -q "PostgreSQL database dump complete" <<<"$tail_lines" ||
        fail "dump tronqué (marqueur de fin absent) : $dump"
      ;;
  esac

  if [ "$check" = 1 ]; then
    [ $# -eq 1 ] || usage
    # Globale : le trap EXIT s'exécute hors de la portée de `main`.
    CHECK_DB="restore_check_$$"
    trap 'psql_maint -c "drop database if exists $(quote_ident "$CHECK_DB") with (force)" >/dev/null 2>&1 || true' EXIT
    psql_maint -c "create database $(quote_ident "$CHECK_DB")"
    restore_into "$dump" "$CHECK_DB" || fail "restauration interrompue (voir l'erreur PostgreSQL ci-dessus)"
    verify "$CHECK_DB"
    log "Test de restauration réussi. La base jetable « $CHECK_DB » est supprimée."
    return
  fi

  [ $# -eq 2 ] || usage
  local target="$2"
  if db_exists "$target"; then
    local count
    count="$(public_table_count "$target")"
    [ "$count" -eq 0 ] ||
      fail "« $target » contient déjà $count tables. Restaurer dans une base vide (voir docs/dev/runbook.md)."
  else
    psql_maint -c "create database $(quote_ident "$target")"
    log "Base « $target » créée."
  fi
  restore_into "$dump" "$target" || fail "restauration interrompue (voir l'erreur PostgreSQL ci-dessus)"
  verify "$target"
  log "Étape suivante : node ace migration:status (voir docs/dev/runbook.md)."
}

main "$@"
