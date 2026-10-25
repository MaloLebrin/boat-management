# 2026-10-25 — Marketing : boutons blancs sur fond navy illisibles en thème sombre

Repéré sur le CTA final de la home en mode sombre : le bouton « Créer mon organisation » se fondait dans le bandeau navy.

- **Cause.** Le bouton forçait `bg-cream!` sur un panneau navy permanent. Or `--color-cream` est remappé en navy foncé par `[data-theme='dark']` : le bouton prenait la couleur du bandeau. Quatre autres boutons blancs sur navy (sidebar du formulaire de contact, tableau détaillé, ROI et paliers de la page tarifs) avaient le même défaut au survol seulement (`hover:bg-cream!`).
- **Correctif.** `bg-white!` / `hover:bg-white/90!` sur ces cinq boutons, comme le CTA de la FAQ de la home : le blanc n'est pas un jeton qui bascule, il reste lisible sur navy dans les deux thèmes (exception documentée des bandeaux navy permanents dans `CLAUDE.md`).
- **Tests.** Aucun nouveau test : changement de classes utilitaires, sans logique. Non revérifié dans le navigateur (serveur de dev arrêté).
