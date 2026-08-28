# 2026-08-25 — Bottom tab bar mobile : 4 raccourcis selon le rôle (#492)

Sur téléphone, toute navigation passait par le hamburger puis le drawer — deux gestes par changement d'écran. Pour un mécanicien qui alterne planning ↔ fiche bateau, c'était le principal frein terrain.

- **`MobileBottomNav.vue`** (`lg:hidden`, ~45 lignes) : barre de 4 onglets max, hauteur 56 px, cibles ≥ 44 px (`min-h-11`), `<Link>` Inertia uniquement, tokens sémantiques (`bg-surface-elevated`, `border-border`, actif `text-brand`), `aria-label` + `aria-current="page"`.
- **Aucune logique de droits dupliquée.** Nouveau computed `bottomNavItems` dans `use_nav_sections.ts` (source unique de la nav), gardé par les mêmes `can()` : `mechanic` → Dashboard / Planning / Historique / Bateaux ; `admin`/`member` → Dashboard / Bateaux / Planning / Réservations ; `boat_owner` → barre masquée (un seul écran pertinent).
- **Montage dans le flux du shell** (`default.vue`, après le `<main>` scrollable, jamais en `fixed`) : la barre ne recouvre aucun contenu — pas besoin du `pb-16` compensatoire sur `<main>` qu'aurait demandé un positionnement fixe — et `pb-[env(safe-area-inset-bottom)]` dégage l'indicateur home iOS (#484). Le drawer reste la navigation complète, les deux coexistent.
- **i18n.** `nav.bottomNav` (aria-label) dans les deux locales ; les libellés d'onglets réutilisent les clés `nav.*` existantes.
- **Doc.** Section « Layout authentifié » de `docs/frontend/ui-map.md` ; le composant est déclaré dans le scan anti-couleurs-figées `theme_safe_components.spec.ts`.
- **Tests.** 9 cas Vitest : 4 entrées `mechanic`, 4 entrées `admin`, barre masquée `boat_owner`, entrées gardées par capabilities, entrée active (query et routes imbriquées comprises), `<Link>` partout, `lg:hidden` + safe-area, clé traduite. Vérifié en dev (viewport 375×812) : barre collée au bas, onglet actif suivant la route, navigation SPA. Suite frontend : 1224 verts. Visibilité par breakpoint : couverte par #500.
