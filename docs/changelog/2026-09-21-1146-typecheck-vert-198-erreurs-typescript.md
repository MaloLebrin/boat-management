# `pnpm typecheck` repasse au vert — 198 erreurs TypeScript

**Date** : 21 septembre 2026

## Contexte

`pnpm typecheck` (`tsc -b` puis `vue-tsc` sur `inertia/tsconfig.json`) sortait
en erreur avec **198 diagnostics**. Le programme serveur était vert : tout
venait du programme client, qu'aucun job de CI ne faisait tourner — les erreurs
se sont donc accumulées sans jamais rougir une PR.

Deux d'entre elles n'étaient pas cosmétiques : elles décrivaient du code mort au
runtime (animations de révélation jamais jouées, bouton sans classe de taille).

## Ce qui change

### Câblage du programme client (≈ 110 erreurs)

`inertia/client.ts` importe le registre généré (`.adonisjs/client/registry`),
qui référence **chaque contrôleur** : les fichiers de `app/controllers/` font
donc partie du programme client. Mais ce programme ne chargeait ni la carte des
pages ni celle des routes générées côté serveur.

- `.adonisjs/server/routes.d.ts` est ajouté aux `include` de
  `inertia/tsconfig.json` : `response.redirect().toRoute('dashboard')` cessait
  d'être « expected 0 arguments », et `<Link :route>` connaît enfin les noms de
  routes côté Vue.
- `inertia/inertia_pages.d.ts` (nouveau) neutralise, **dans le seul programme
  client**, le contrôle des props de `inertia.render()`. `pages.d.ts` ne peut
  pas y être ajouté tel quel : il résout les `.vue` pour de vrai, et les props
  décrites par une `interface` — la convention du repo — ne satisfont jamais la
  contrainte `Record<string, JSONDataTypes>` d'Inertia, faute de signature
  d'index implicite. Le contrat nom de page / props reste vérifié par
  `tsc -b`, qui charge `pages.d.ts` : `inertia.render('page/inexistante')`
  échoue toujours à la compilation.

### Révélation au scroll : `:ref` dynamique → `useTemplateRef` (≈ 42 erreurs, bug réel)

42 sections marketing liaient leur élément avec `:ref="sectionEl"`. Une liaison
dynamique reçoit la valeur **déréférencée** du ref, donc `null` au premier
rendu : l'`IntersectionObserver` n'observait rien, `onMounted` retombait sur son
repli « tout visible » et l'animation ne jouait jamais.

`useScrollReveal`, `useCountUp` et `useTilt` résolvent désormais leur cible avec
`useTemplateRef(nom)` ; les composants passent le nom du `ref="…"` posé dans le
template et n'ont plus à ré-exposer le ref.

### Corrections ponctuelles

- **`BaseButton size="xs"`** (`BoatOverviewPositionCard`) : taille inexistante,
  donc bouton rendu sans classe de taille ni cible tactile → `size="sm"`.
- **`design_system.vue`** : imports remontés en tête du `<script setup>` (un SFC
  à deux blocs `<script>` compile le setup dans une fonction — 21 × TS1232).
- **File hors-ligne** : `QueuedAction.payload` est typée sur la charge utile
  acceptée par une visite Inertia, et les casts `as Record<string, unknown>` des
  appelants disparaissent.
- **`router.reload()`** : `preserveScroll` retiré des deux formulaires de
  catalogue — l'option ne fait pas partie de `ReloadOptions`, `reload()`
  préservant toujours scroll et état.
- **Divers** : imports `#shared/types/maintenance` (chemin relatif faux d'un
  cran), `PortEditPayload` → `PortShowDetail`, `<Form :action="{ url, method }">`
  sur la réinitialisation de mot de passe, `useRemember` casté en `Ref` comme
  dans `use_catalog_form_draft`, handlers `BaseSelect` typés `string | number`,
  options de `BudgetBarChart` typées `ChartOptions<'bar'>`, `notes` optionnel sur
  `BoatEquipmentRigFieldsModel`, `user?.` dans `ProfileCard`, `:rows="3"`, deux
  imports et une variable morts.

### Garde-fou CI

Un job `typecheck` est ajouté à `.github/workflows/ci.yml`, à côté de `lint` :
sans lui, la dette repart à zéro dès la PR suivante.

## Tests

- `tests/inertia/scroll_reveal.spec.ts` (nouveau) : l'observer reçoit bien la
  section (ref par défaut et ref nommé) et la classe `visible` n'apparaît qu'à
  l'intersection. Le test échoue sur l'implémentation précédente.
- Les deux specs de formulaires catalogue n'attendent plus `preserveScroll`
  dans les options de `router.reload()`.
- `pnpm typecheck` : 0 erreur. `pnpm lint` : inchangé (4 avertissements
  `max-lines` préexistants). `pnpm test:inertia` : 2556 tests verts.
