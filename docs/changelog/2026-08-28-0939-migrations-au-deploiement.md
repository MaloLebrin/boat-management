# 2026-08-28 — Migrations orchestrées au déploiement (#542)

Ni le `Dockerfile` (`CMD` = `node bin/server.js` seul) ni les workflows GitHub Actions ne lançaient les migrations : un déploiement sur base vierge, ou incluant une nouvelle migration, cassait l'app.

- **Principe.** Les migrations ne tournent jamais dans le `CMD` de l'image — un serveur web qui migre au boot casse dès qu'il y a plus d'un conteneur. Elles sont une étape distincte, exécutée avant le démarrage de la nouvelle version.
- **Self-host.** Service one-shot `migrator` dans `docker-compose.prod.yml` (`node ace migration:run --force`). `web`, `worker` et `worker-ai` en dépendent via `depends_on: { condition: service_completed_successfully }` ; `restart: 'no'` fait échouer le déploiement si la migration échoue.
- **PaaS.** Release command `node ace migration:run --force`, exposée en `pnpm migrate:prod`. `--force` est obligatoire : Adonis refuse sinon de migrer avec `NODE_ENV=production`. Le build Adonis produit un `ace.js` dans `build/`, la commande s'exécute donc depuis le `WORKDIR /app` de l'image.
- **Documentation.** `docs/dev/hosting.md` (section « Migrations au déploiement ») et rappel dans le placeholder de déploiement de `.github/workflows/docker.yml`.
