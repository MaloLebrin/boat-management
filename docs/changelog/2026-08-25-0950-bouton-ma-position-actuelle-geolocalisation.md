# 2026-08-25 — Bouton « Ma position actuelle » sur la position du bateau (#486)

La position d'un bateau se saisissait dans deux champs texte latitude/longitude : sur un téléphone à bord, taper deux coordonnées décimales est pénible et une décimale fausse déplace le bateau de plusieurs kilomètres sans que rien ne le signale.

- **`BoatOverviewPositionCard.vue`.** Bouton « Ma position actuelle » dans le formulaire de saisie manuelle : `navigator.geolocation.getCurrentPosition()` avec `enableHighAccuracy: true` (timeout 15 s), remplit les deux champs arrondis à **5 décimales** (comme l'affichage existant). Aucune soumission automatique — l'utilisateur vérifie puis valide.
- **Précision affichée.** `coords.accuracy` arrondie au mètre est montrée après un fix (« Position relevée (précision ±{meters} m) — vérifiez-la avant d'enregistrer ») : une position à ±2 km ne part pas en base à l'insu de l'utilisateur.
- **Trois échecs explicites.** Permission refusée, position indisponible, timeout — un message distinct par cas (`role="alert"`), effacé à la tentative suivante. Le bouton est masqué si l'API n'existe pas.
- **i18n.** 6 clés `boats.show.position.*` dans les deux locales, vouvoiement côté FR.
- **Tests.** 8 cas Vitest (`boat_overview_position_card.spec.ts`) : remplissage arrondi + précision affichée, pas d'auto-soumission, trois messages d'échec, reset de l'erreur au retry, bouton masqué sans API, clés présentes dans les deux locales.
- **Note.** La Geolocation API exige un contexte sécurisé (HTTPS ou `localhost`) — sans effet en production.
