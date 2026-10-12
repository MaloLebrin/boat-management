# 2026-10-12 — Navigation Inertia hors-ligne vers une page en cache (#968)

Épic « Mode traversée » (#949), phase 1.

Hors-ligne, un clic sur un lien de l'app (visite Inertia, XHR `X-Inertia`) échouait sans rien afficher alors que la page était en cache : le service worker ne met en cache que les navigations pleine page. Seul un rechargement complet la servait.

- **Bascule en navigation pleine page.** Nouveau `inertia/utils/offline_navigation.ts`, installé dans `inertia/app.ts` : sur l'événement `exception` du routeur Inertia, une visite GET restée **sans réponse** (erreur réseau, pas une 4xx/5xx) bascule en `window.location.assign`. Le SW sert alors la dernière version en cache ou `/offline.html`. Le rejet de la visite est annulé et une probe de connectivité (#953) est relancée pour mettre le bandeau à jour.
- **Exclusions.** Mutations (prises en charge par la file hors-ligne), préchargements (`Purpose: prefetch`) et rechargements partiels (`only`/`except`). Une seule bascule par page, sans boucle possible.
- **Indépendant de l'état de connectivité** : au moment du clic, la dernière probe peut dater de 5 minutes ; l'absence de réponse fait foi.
- **Copilote** : l'entrée `offline-pwa` précise que les liens rouvrent les pages déjà visitées hors-ligne.
- **Tests** : `tests/inertia/offline_navigation.spec.ts` (14 cas) et `tests/browser/offline_navigation.spec.ts` — coupure des seules requêtes Inertia, le clic aboutit par chargement de document ; le test échoue sans le correctif.
