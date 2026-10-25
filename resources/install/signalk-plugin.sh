#!/usr/bin/env bash
# Installe le plugin FleetAi (signalk-fleetai) sur un serveur Signal K existant.
#
#   curl -fsSL <instance>/install/signalk-plugin.sh | FLEETAI_TOKEN=fai_ing_… bash
#
# Variables : FLEETAI_TOKEN (obligatoire), FLEETAI_ENDPOINT, SIGNALK_NODE_CONFIG_DIR,
#             FLEETAI_ALLOW_ROOT=1, FLEETAI_DRY_RUN=1 (ne touche ni npm ni systemd).
# Le script n'installe PAS Signal K. Il ne journalise jamais le jeton.
set -euo pipefail

PACKAGE="signalk-fleetai"
CONFIG_FILE="plugin-config-data/signalk-fleetai.json"
DEFAULT_ENDPOINT="__FLEETAI_INGEST_ENDPOINT__"
ENDPOINT="${FLEETAI_ENDPOINT:-$DEFAULT_ENDPOINT}"
DRY_RUN="${FLEETAI_DRY_RUN:-0}"

say() { printf '%s\n' "$*"; }
fail() { printf 'Erreur : %s\n' "$*" >&2; exit "${2:-1}"; }

missing_signalk() {
  {
    printf 'Erreur : %s\n' "$1"
    say "Ce script installe le plugin FleetAi sur un serveur Signal K existant ; il n'installe pas Signal K."
    say "  - Installateur officiel : https://github.com/SignalK/signalk-server/blob/master/README.md"
    say "  - Image OpenPlotter (Raspberry Pi) : https://openmarine.net/openplotter"
  } >&2
  exit 2
}

if [ "$(id -u)" -eq 0 ] && [ "${FLEETAI_ALLOW_ROOT:-0}" != "1" ]; then
  fail "ne lancez pas ce script en root (les fichiers Signal K appartiendraient à root). Relancez avec l'utilisateur de Signal K, ou FLEETAI_ALLOW_ROOT=1." 1
fi

command -v node >/dev/null 2>&1 || missing_signalk "Node.js est introuvable."
command -v npm >/dev/null 2>&1 || missing_signalk "npm est introuvable."
command -v signalk-server >/dev/null 2>&1 || missing_signalk "signalk-server est introuvable."

CONFIG_DIR="${SIGNALK_NODE_CONFIG_DIR:-$HOME/.signalk}"
[ -d "$CONFIG_DIR" ] || missing_signalk "dossier de configuration Signal K introuvable : $CONFIG_DIR (définissez SIGNALK_NODE_CONFIG_DIR)."

TOKEN="${FLEETAI_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -t 0 ]; then
  printf "Jeton d'ingestion FleetAi (fai_ing_…) : " >&2
  read -r -s TOKEN
  printf '\n' >&2
fi
[ -n "$TOKEN" ] || fail "FLEETAI_TOKEN est obligatoire (onglet Instruments → carte « Plugin Signal K » → générer un jeton)." 1
case "$TOKEN" in
  fai_ing_*) ;;
  *) fail "le jeton doit commencer par fai_ing_." 1 ;;
esac

say "Installation de $PACKAGE dans $CONFIG_DIR"
if [ "$DRY_RUN" = "1" ]; then
  say "[dry-run] npm install --omit=dev --no-fund --no-audit $PACKAGE@latest"
else
  (cd "$CONFIG_DIR" && npm install --omit=dev --no-fund --no-audit "$PACKAGE@latest")
fi

mkdir -p "$CONFIG_DIR/plugin-config-data"
FLEETAI_TARGET="$CONFIG_DIR/$CONFIG_FILE" FLEETAI_ENDPOINT_VALUE="$ENDPOINT" FLEETAI_TOKEN_VALUE="$TOKEN" node -e '
const fs = require("fs");
const target = process.env.FLEETAI_TARGET;
let current = {};
try { current = JSON.parse(fs.readFileSync(target, "utf8")); } catch (e) { current = {}; }
const previous = current.configuration && typeof current.configuration === "object" ? current.configuration : {};
const next = {
  ...current,
  enabled: true,
  configuration: {
    periodSeconds: 60,
    ...previous,
    endpoint: process.env.FLEETAI_ENDPOINT_VALUE,
    token: process.env.FLEETAI_TOKEN_VALUE,
  },
};
fs.writeFileSync(target, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
'
chmod 600 "$CONFIG_DIR/$CONFIG_FILE" 2>/dev/null || true
say "Configuration écrite : $CONFIG_DIR/$CONFIG_FILE (endpoint : $ENDPOINT)"

if [ "$DRY_RUN" = "1" ]; then
  say "[dry-run] redémarrage de signalk.service ignoré"
elif command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet signalk.service 2>/dev/null; then
  say "Redémarrage de signalk.service…"
  systemctl restart signalk.service 2>/dev/null || sudo systemctl restart signalk.service \
    || say "Redémarrage impossible : lancez « sudo systemctl restart signalk.service »."
else
  say "Redémarrez Signal K depuis l'interface d'administration (Serveur → Redémarrer) ou avec « sudo systemctl restart signalk.service »."
fi

say ""
say "Terminé. Vérifiez dans l'admin Signal K → Plugin Config → FleetAi, puis dans FleetAi, onglet Instruments du bateau."
