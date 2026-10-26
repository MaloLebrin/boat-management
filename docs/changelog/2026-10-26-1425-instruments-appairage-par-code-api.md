# 2026-10-26 — Appairage par code d'un boîtier Signal K : API (#1032)

Première brique du parcours « plug and play » (niveau 1) : le boîtier obtient un code court, l'admin le saisit dans FleetAi, le boîtier reçoit son jeton d'ingestion **sans qu'il passe par le presse-papiers**. Le plugin, l'image Raspberry Pi, l'assistant et la page publique suivent (issue #1032 reste ouverte).

- **API boîtier** (JSON, sans session ni CSRF). `POST /api/instruments/pairing` → `201 { deviceCode, userCode, expiresIn: 600, interval: 5 }` (limité à 10 / 10 min / IP) ; `POST /api/instruments/pairing/poll { deviceCode }` → `pending` | `expired` | `approved` + jeton `fai_ing_…` livré **une seule fois** (limité à 120 / min / IP). Champs facultatifs `deviceLabel`, `hardwareKind`, `pluginVersion`.
- **Rattachement.** `POST /boats/:boatId/instrument-source/pairing { userCode }` (admin, Pro/Entreprise) : rattache l'appairage, crée la source au besoin (`http://signalk.local:3000`), redirige avec flash. Code inconnu, mal formé ou expiré : même message ; code déjà utilisé : message distinct ; 5 essais ratés / 15 min / utilisateur. Audit `boat.instrument_pairing_attach`.
- **Jeton jamais stocké.** Généré au `poll` qui suit le rattachement, sous verrou de ligne, avec `consumed_at` dans la même transaction : la base ne garde que son sha256. Rattacher un bateau déjà doté d'un jeton le remplace à la livraison.
- **Empreintes seules.** `deviceCode` (sha256) et `userCode` (HMAC-SHA256 clé `APP_KEY`, 8 symboles sans caractères ambigus). Table `instrument_pairings` : `boat_id` / `organization_id` / `claimed_by_user_id` nuls à la création, `hardware_kind` prévu pour le niveau 2.
- **Purge.** Job `PurgeInstrumentPairings`, quotidien à 01:20.
- **i18n.** Messages flash EN + FR (`flash.instruments.pairing*`, vouvoiement) et libellé d'audit.
- **Tests.** Japa functional `instrument_pairing.spec.ts` (création, limites de débit, pending / expired / approved, jeton unique y compris en concurrence, refus Starter / membre / autre organisation / expiré / déjà utilisé, limite d'essais, purge, aucun secret en base ni en audit) ; unit `instrument_pairing_service.spec.ts` (alphabet, unicité, empreintes, normalisation).
- **Docs.** `docs/domain/instruments.md` (« Appairage par code »), `docs/architecture/instruments-epic-986.md` (D11), `docs/data/schema.md`.
