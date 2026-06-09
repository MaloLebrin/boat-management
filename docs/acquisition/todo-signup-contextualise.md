# ✅ DONE (2026-06-09) — Page signup contextualisée après simulateur

## Contexte

Quand un visiteur clique sur "Créer mon compte" depuis la CTA du simulateur, il est redirigé vers `/signup` via `POST /simulator/session`.
La page signup est générique : rien ne rappelle à l'utilisateur pourquoi il est là ni que son bateau sera créé automatiquement.
Ce manque de contexte augmente le drop-off entre la CTA simulateur et la complétion du signup.

## Objectif

Réduire le drop-off sur la page signup en rappelant le contexte du simulateur et en confirmant que le bateau sera ajouté automatiquement après inscription.

---

## Backend

### `SimulatorController.saveSession`

Modifier le redirect pour inclure un query param :

```ts
// avant
return response.redirect('/signup')

// après
return response.redirect('/signup?from=simulator')
```

Aucune autre modification backend nécessaire — la logique de création du bateau depuis la session est déjà en place dans `NewAccountController.store`.

---

## Frontend

### `inertia/pages/auth/signup.vue`

- Lire le query param `from` via `usePage().props` ou `new URLSearchParams(window.location.search)`
- Si `from === 'simulator'` : afficher un bandeau/encart contextuel au-dessus du formulaire

Maquette de l'encart :

```
┌─────────────────────────────────────────────────┐
│  ✓  Votre bateau sera ajouté automatiquement    │
│     à votre compte dès votre inscription.       │
└─────────────────────────────────────────────────┘
```

Style suggéré : `bg-coral-50 border border-coral-200 rounded-xl px-4 py-3 text-sm text-fg`

### Props à passer depuis le controller

Option A (plus propre) — passer `fromSimulator: boolean` depuis `NewAccountController.create` :

```ts
async create({ inertia, request }: HttpContext) {
  const fromSimulator = request.qs().from === 'simulator'
  return inertia.render('auth/signup', { fromSimulator })
}
```

Option B — lire le query param côté client directement dans le composant Vue.

**Préférer l'option A** pour rester cohérent avec le pattern Inertia du projet.

### i18n

Ajouter dans `resources/lang/fr/auth.json` et `en/auth.json` :

```
auth.signup_from_simulator_notice
```

---

## Critères d'acceptance

- [ ] Quand `from=simulator` est présent dans l'URL, l'encart contextuel est affiché
- [ ] Quand `from=simulator` est absent, la page signup est inchangée
- [ ] L'encart n'apparaît pas si l'utilisateur navigue vers `/signup` directement
- [ ] Clés i18n présentes en FR et EN
- [ ] Le redirect de `saveSession` inclut `?from=simulator`

---

## Notes

- Ne pas conditionner la logique de création du bateau au param `from` — elle repose uniquement sur la présence de `simulatorBoat` en session, ce qui est correct
- Cette modification est non-breaking : les utilisateurs qui arrivent sur signup sans le param voient la page inchangée
