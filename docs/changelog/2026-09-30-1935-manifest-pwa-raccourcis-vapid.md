# 2026-09-30 — Manifeste PWA : identité, raccourcis, captures et clés VAPID (#865)

Le manifeste statique n'exposait que le nom, deux icônes et un `start_url` vers la home marketing. L'app installée n'avait pas d'identité stable, pas de raccourcis d'écran d'accueil, et les clés VAPID restaient documentées comme optionnelles alors que l'écran de notifications promet le push.

- **Manifeste.** `public/site.webmanifest` est retiré. `GET /site.webmanifest` (`PwaManifestController`) répond `application/manifest+json` dans la locale de la requête. `id: "/"`, `scope: "/"`, `start_url: "/dashboard?source=pwa"`, description, `orientation`, `categories`, quatre raccourcis (journal, carburant, incidents, flotte) et deux captures (`public/pwa/`).
- **Compteur.** `pwa_launch_counters` (une ligne par organisation). `/dashboard?source=pwa` incrémente `launches` une fois par session et envoie `launchedFromPwa` au tableau de bord, y compris au mécanicien. Le propriétaire est compté avant la redirection vers son portail.
- **VAPID.** Obligatoires en production (`docs/dev/hosting.md` § 2). Le boot reste possible sans elles (test, CI, local). `GET /up` ajoute `checks.vapid` (`ok` ou `missing`) sans faire échouer la probe : un 503 recyclerait le conteneur. Un warning est journalisé au premier `/up` en production si les clés manquent.
- **Tests.** Unitaire du manifeste et du rapport de santé. Fonctionnel : JSON, locales, URLs des raccourcis, dimensions des captures, compteur de lancements. Les captures se régénèrent en local avec `UPDATE_PWA_SCREENSHOTS=1` (hors CI).
