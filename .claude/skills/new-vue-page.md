---
name: new-vue-page
description: >
  Crée une nouvelle page Inertia (Vue 3 + AdonisJS v7) : page Vue, i18n EN+FR, route,
  méthode controller. Ex: /new-vue-page settings/notifications
---

# Nouvelle page Inertia : $ARGUMENTS

Lis les fichiers existants du domaine avant d'écrire.

## Les 5 étapes

**1. Types (si props non triviales) — `shared/types/<domain>.ts`**

- Ajouter l'interface des props si elles sont complexes ; sinon typer inline dans `defineProps`

**2. Page Vue — `inertia/pages/<path>.vue`**

- `<script setup>` + `defineProps<{}>()` + `import { useT } from '~/composables/use_t'`
- Zéro texte en dur — tout via `t('clé')`
- Mutations : `useForm` ou `router.post/patch/put/delete` — jamais `fetch`/`axios` + CSRF manuel
- **Max 250 lignes** — extraire en `inertia/components/<domain>/` si dépassé
- Onglets : chaque onglet = composant dans `inertia/components/<domain>/show/tabs/`
- Si `t` est déjà pris : `const { t: tApp } = useT()`

**3. i18n — `resources/lang/fr/<namespace>.json` et `resources/lang/en/<namespace>.json`**

- Les deux fichiers en même temps, jamais l'un sans l'autre
- Créer le fichier s'il n'existe pas encore

**4. Méthode controller — `app/controllers/<domain>_controller.ts`**

- `await auth.authenticate()` + `auth.getUserOrFail()`
- GET → `return inertia.render('<path>', { …transformer(data) })`
- Mutation → `return response.redirect()` — **jamais `response.json()`**
- Bouncer si la page est protégée

**5. Route — `start/routes/<domain>.ts`**

```ts
router.get('<path>', [controllers.<Controller>, '<method>']).as('<resource>.<action>')
```

- Nommage `resource.action` (ex: `settings.notifications`)
- Si nouveau domaine : créer le fichier + ajouter `import './routes/<domain>.js'` dans `start/routes.ts`

## Changelog — `docs/changelog.md`

Entrée en tête avec date, fichiers créés, description courte.

## Checklist

- [ ] `npx vue-tsc --noEmit --project inertia/tsconfig.json` OK
- [ ] `npx tsc --noEmit` OK
- [ ] Zéro texte en dur dans le template
- [ ] Page < 250 lignes
- [ ] i18n fr + en présents
- [ ] Route nommée `resource.action`
- [ ] Controller : `inertia.render()` (GET) ou `response.redirect()` (mutations)
- [ ] Changelog mis à jour
