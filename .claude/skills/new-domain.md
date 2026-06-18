---
name: new-domain
description: >
  Crée un domaine métier complet (AdonisJS v7 + Vue 3/Inertia) pour $ARGUMENTS.
  14 fichiers dans l'ordre : exceptions, migration, model, factory, validator, shared types,
  service, transformer, policy, controller, routes, i18n EN+FR, pages Inertia, tests, changelog.
---

# Nouveau domaine : $ARGUMENTS

Lis les fichiers de référence avant d'écrire. `<Domain>` = PascalCase, `<domain>` = snake_case.

## Fichiers à créer dans l'ordre

**1. `app/exceptions/<domain>_errors.ts`**

```ts
export class <Domain>NotFoundError extends Error { name = '<Domain>NotFoundError' }
```

**2. Migration** — générer via `node ace make:migration create_<domain>s_table`

- FK `organization_id` → `organizations` + `onDelete('CASCADE')`
- `table.timestamps(true, true)` + `down()` avec `dropTable`

**3. `app/models/<domain>.ts`**

- `@column({ isPrimary: true }) declare id: number`
- `@column() declare organizationId: number`
- `@belongsTo(() => Organization) declare organization: BelongsTo<typeof Organization>`
- `@column.dateTime({ autoCreate: true }) declare createdAt: DateTime` (idem `updatedAt` avec `autoUpdate`)

**4. `database/factories/<domain>_factory.ts`**

- `Factory.define(<Domain>, ({ faker }) => ({ … })).build()` — données réalistes

**5. `app/validators/<domain>.ts`**

- `vine.create({…})` pour create et update — **jamais `vine.compile`**

**6. `shared/types/<domain>.ts`**

- Interfaces `<Domain>Payload`, `<Domain>ShowProps` — jamais inline dans `app/`

**7. `app/services/<domain>_service.ts`**

- `@inject()` + constructeur typé — jamais `new X()` inline
- Méthodes : `listForUser`, `getForUserOrFail`, `createForUser`, `updateForUser`, `deleteForUser`
- Lance `<Domain>NotFoundError` si introuvable

**8. `app/transformers/<domain>_transformer.ts`**

- Fonctions pures `to<Domain>List`, `to<Domain>Show`, `to<Domain>EditForm`
- Dates via `.toISODate()` ou `.toISO()`

**9. `app/policies/<domain>_policy.ts`**

```ts
export default class <Domain>Policy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) return true
  }
  view(user: User, item: <Domain>): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === item.organizationId
  }
  create(user: User): AuthorizerResponse { return user.organizationId !== null }
  edit(user: User, item: <Domain>): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === item.organizationId
  }
  delete(_user: User, _item: <Domain>): AuthorizerResponse { return false }
}
```

**10. `app/controllers/<domain>s_controller.ts`**

- `@inject()` + services dans le constructeur
- Chaque action : `await auth.authenticate()` → `bouncer.with(<Domain>Policy).authorize(…)` → service → transformer → `inertia.render()` (GET) ou `response.redirect()` (mutations)
- **Jamais `response.json()`** sur des routes Inertia
- Erreur `<Domain>NotFoundError` → `response.redirect('/<domain>s')`
- `store`/`update`/`destroy` → `auditLogService.log(…)` avec `action: '<domain>.create'` etc.

**11. `start/routes/<domain>.ts`**

```ts
router.group(() => {
  router.get('<domain>s', [controllers.<Domain>s, 'index']).as('<domain>s.index')
  router.get('<domain>s/new', [controllers.<Domain>s, 'create']).as('<domain>s.create')
  router.post('<domain>s', [controllers.<Domain>s, 'store']).as('<domain>s.store')
  router.get('<domain>s/:id', [controllers.<Domain>s, 'show']).as('<domain>s.show')
  router.get('<domain>s/:id/edit', [controllers.<Domain>s, 'edit']).as('<domain>s.edit')
  router.put('<domain>s/:id', [controllers.<Domain>s, 'update']).as('<domain>s.update')
  router.delete('<domain>s/:id', [controllers.<Domain>s, 'destroy']).as('<domain>s.destroy')
}).use(middleware.auth())
```

Ajouter `import './routes/<domain>.js'` dans `start/routes.ts`.

**12. i18n — `resources/lang/fr/<domain>.json` et `resources/lang/en/<domain>.json`**

- Clés minimales : `new.{title,submit,cancel}`, `edit.{title,submit,cancel}`, `fields.{}`, `actions.{delete,edit}`, `empty`
- Les deux fichiers en même temps

**13. Pages Inertia — `inertia/pages/<domain>s/{index,show,new,edit}.vue`**

- `<script setup>` + `defineProps<{}>()` + `import { useT } from '~/composables/use_t'`
- Zéro texte en dur — tout via `t('clé')`
- Mutations : `useForm` ou `router.post/patch/put/delete` — jamais `fetch`/`axios`
- **Max 250 lignes** — extraire en sous-composants si dépassé

**14. `tests/functional/<domain>s/<domain>s.spec.ts`**

```ts
test.group('<Domain>s (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  // GET index → 200 (user authentifié)
  // GET index → 302 /login (non authentifié)
  // POST store → crée + assertRedirectsTo(`/<domain>s/${item.id}`) — createAdminUser()
  // DELETE destroy → supprime + assertRedirectsTo('/<domain>s') — createAdminUser()
})
```

**15. `docs/changelog.md`** — entrée en tête avec date + liste des fichiers créés

## Checklist

- [ ] `node ace migration:run` OK
- [ ] `npx tsc --noEmit` OK
- [ ] `npx vue-tsc --noEmit --project inertia/tsconfig.json` OK
- [ ] i18n fr + en présents
- [ ] Import routes ajouté dans `start/routes.ts`
- [ ] `node ace test --files="tests/functional/<domain>s"` OK
- [ ] Changelog mis à jour
