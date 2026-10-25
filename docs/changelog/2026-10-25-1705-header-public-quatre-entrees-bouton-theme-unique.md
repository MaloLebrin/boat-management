# 2026-10-25 — Header public : quatre entrées et un bouton de thème unique

Le header marketing cumulait sept entrées de navigation (Produit ▾, Simulateur de coût, Diagnostic IA, Pièces IA, Tarifs, Guide entretien, Aide) et cinq contrôles à droite (langue, trois boutons de thème, Connexion, Essayer) : à l'étroit dès 800 px, et la nav complète ne tenait qu'à partir de `lg`.

- **Quatre entrées.** Produit ▾ (groupes « Fonctionnalités » et « Outils gratuits »), Diagnostic IA en lien direct (lead magnet du moment, #609 ; il reste aussi listé dans « Outils gratuits »), Tarifs, Ressources ▾ (Guide entretien, Aide). Les trois outils gratuits ne sont plus des liens directs, sauf le diagnostic.
- **Menu déroulant générique.** `AppHeaderProductMenu` devient `AppHeaderNavMenu` (`labelKey` + `groups`, intertitre de groupe facultatif) et sert aux deux menus. `usePublicNav` expose `productGroups`, `featuredLinks`, `topLinks`, `resourceGroups` ; le drawer mobile consomme les mêmes groupes, puis Tarifs, Guide et Aide à plat.
- **Bouton de thème unique.** Nouveau `ThemeToggle` dans le header : une seule icône (préférence courante) qui cycle système → clair → sombre. `ThemeSwitcher` (trois boutons) reste dans le drawer mobile et les réglages ; les trois pictogrammes sont extraits dans `ThemeIcon`.
- **i18n.** `public.nav.resources` et `common.theme.toggle` en FR/EN.
- **Tests.** Vitest : quatre entrées dans l'ordre, diagnostic en lien direct sans ouvrir de menu, contenu des menus Produit et Ressources, bouton de thème unique (pas de `role="group"` dans le header), drawer mobile complet ; `ThemeToggle` (libellé, cycle des trois préférences). Vérifié dans le navigateur en clair, sombre et mobile.
