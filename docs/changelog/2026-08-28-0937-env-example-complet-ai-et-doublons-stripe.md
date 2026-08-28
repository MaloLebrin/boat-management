# 2026-08-28 — `.env.example` complet : IA et doublons Stripe (#540)

`start/env.ts` valide les variables au boot : l'app ne démarre pas si une variable requise manque. Or `.env.example` — la seule référence pour monter un environnement — était incomplet, ce qui faisait échouer un `cp .env.example .env` suivi d'un `pnpm dev`.

- **Cause.** `AI_PROVIDER` et `MISTRAL_API_KEY` sont requis par `start/env.ts` mais absents du fichier. À l'inverse, `STRIPE_SECRET_KEY` et les deux `STRIPE_ADDON_EXTRA_BOATS_*` y figuraient deux fois, la seconde occurrence écrasant silencieusement la première.
- **Correctif.** Nouveau bloc « IA (Mistral) » avec `AI_PROVIDER`, `AI_MODEL` (optionnel, repli `mistral-small-latest`) et `MISTRAL_API_KEY` ; suppression des trois doublons Stripe. Ajout d'un bloc « Déploiement self-host » (`APP_DOMAIN`, `LETSENCRYPT_EMAIL`, `IMAGE_TAG`) consommé par `docker-compose.prod.yml` et le `Caddyfile`.
- **Variables résiduelles.** `DRIVE_DISK`, `CLOUDINARY_URL`, `VITE_MISTRAL_API_KEY` et `VITE_AI_PROVIDER` ne sont référencées nulle part dans le code : elles n'ont jamais été dans `.env.example` et ne doivent pas être reportées dans un `.env` de production (une clé Mistral préfixée `VITE_` partirait dans le bundle client). Documenté dans `docs/dev/hosting.md`.
