# 2026-06-15 — Fix i18n : drawer mobile — texte hardcodé remplacé par t() (#34)

**Correctif — i18n / Layout**

Le drawer de navigation mobile dans `inertia/layouts/default.vue` affichait du texte hardcodé en français (sections FLOTTE, MAINTENANCE, PREFERENCES ; items Dashboard, Mes bateaux, Planning, Historique, Reglages, Deconnexion) sans passer par `t()`. Résultat : le drawer restait en français même en anglais.

- Création du composable `inertia/composables/use_nav_sections.ts` — source unique des sections de nav avec `t()` (partagée entre `AsideMenu` et le drawer)
- Création du composant `inertia/components/layout/NavIcon.vue` — icônes SVG extraites pour éliminer la duplication
- Refactorisation de `AsideMenu.vue` pour utiliser le composable + `NavIcon`
- Remplacement dans `default.vue` de tous les textes hardcodés : sections via `navSections`, `aria-label` via `t('nav.closeMenu')`, fallback utilisateur via `t('nav.unknownUser')`, déconnexion via `t('nav.logout')`
- Ajout de la clé `nav.closeMenu` dans `resources/lang/fr/nav.json` et `en/nav.json`
