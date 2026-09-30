# 2026-09-30 — Code mort du starter et reliquats versionnés (#862)

Reliquats accumulés depuis l'initialisation : jobs qui ne font rien, page
d'accueil AdonisJS inatteignable, banc d'essai public, nom `3d-website`, et
deux fichiers qui n'auraient pas dû être suivis.

- **Jobs.** `ProcessMedia` et `ProcessBoatMaintenanceImport` loggaient un
  placeholder et n'étaient enfilés nulle part. Supprimés, avec leurs specs.
  `GenerateExport` est un vrai job depuis #879 : il reste, ainsi que la queue
  `exports`. La queue `maintenance` ne servait que le stub : retirée du worker
  (`docker-compose.prod.yml`, `docs/dev/hosting.md`). La queue `media` reste
  (`ReconcileMedia`). L'import CSV volumineux en arrière-plan, s'il est encore
  voulu, est suivi dans #934 — plus de stub.
- **Abilities.** `placeholder` dans `app/abilities/main.ts` renvoyait toujours
  `false`. Le module reste vide : l'autorisation est dans les policies.
- **Page starter.** `inertia/pages/home.vue` et la branche
  `!auth.isAuthenticated` de `HomeController` (morte : `/dashboard` est derrière
  `middleware.auth()`). L'accueil public reste `marketing/home`.
- **Nom.** `package.json` → `fleetai`. `APP_NAME=FleetAi` dans `.env.example`
  (le logger est le seul lecteur d'`APP_NAME` ; les e-mails écrivent déjà
  FleetAi en dur). Les identifiants Postgres `3d-website` du compose local ne
  changent pas.
- **Fichiers suivis à tort.** `tsconfig.inertia.tsbuildinfo` sorti de git et
  ignoré (`*.tsbuildinfo`). `MERGE_PLAN.md` supprimé ; ce qui reste ouvert de
  l'épic #481 (clés VAPID, e2e, fermeture de l'épic) est dans
  `docs/architecture/pwa-terrain-epic-481.md`.
- **Design system.** `/design-system` n'est enregistrée que si
  `!app.inProduction`. Les tests (`NODE_ENV=test`) et le dev local y accèdent
  encore. Sitemap et nav publique ne la citaient déjà plus.
- **Tests.** Contrat `/design-system` (rendu + garde dans la source), garde
  d'exhaustivité des pages Inertia (exemption `home` retirée), spec unitaire
  du dashboard sans le cas non authentifié.
