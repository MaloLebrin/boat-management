# Curseur pointer global sur les éléments cliquables

**Date** : 2026-09-06

## Contexte

Tailwind v4 n'applique plus `cursor: pointer` aux boutons par défaut (changement de comportement par rapport à v3). Résultat : les `<button>` sans classe `cursor-pointer` explicite (ex. le bouton « rafraîchir » de `EngineAiSuggestionsPanel`, les boutons des cartes réglages IA des PR #640/#641) affichaient le curseur flèche.

## Modification

Ajout d'un bloc `@layer base` dans `inertia/css/app.css`, équivalent à poser `cursor-pointer disabled:cursor-not-allowed` sur chaque élément cliquable de l'application, sans répéter les classes dans les composants :

- `cursor: pointer` sur : `a[href]`, `button`, `select`, `summary`, `label[for]`, `[role='button']`, `[role='tab']`, `[role='menuitem']`, `[role='option']`, et les `input` de type `button`, `submit`, `reset`, `checkbox`, `radio`, `range`, `file` ;
- `cursor: not-allowed` sur : `button:disabled`, `select:disabled`, `input:disabled` et `[aria-disabled='true']` (cas des `BaseButton` rendus en lien avec `disabled`).

## Comportements notables

- Couvre automatiquement tous les composants existants et futurs — plus besoin d'ajouter `cursor-pointer` / `disabled:cursor-not-allowed` manuellement (les occurrences existantes, comme dans `BaseButton`, restent inoffensives).
- Les classes utilitaires Tailwind (`cursor-*`) gardent la priorité sur cette règle de base si un composant veut un curseur différent.
