# Menu latéral allégé : langue et thème dans les réglages

**Date** : 2026-09-15

Le pied du menu latéral (sidebar desktop `AsideMenu.vue` et drawer mobile `MobileSidebarDrawer.vue`) n'affiche plus le switch EN/FR ni le sélecteur de thème.

- La langue et le thème se règlent désormais uniquement dans **Réglages › Mon compte** (`/settings/me`), via les cartes existantes `LanguageCard` (PUT `/settings/locale`) et `ThemeCard`.
- Le composant `LanguageSwitcher.vue`, devenu inutilisé, est supprimé.
- `ThemeSwitcher.vue` reste utilisé par le header des pages publiques (marketing), inchangé.
- Aucun changement de route ni de backend.
