---
name: add-field
description: >
  Ajoute un champ à une ressource existante (AdonisJS v7 + Vue 3/Inertia).
  Touche les 8 endroits dans l'ordre : migration alter, model, validator, shared types,
  transformer, page form Vue, i18n EN+FR, changelog. Ex: /add-field boat insurance_expiry_date
---

# Ajouter un champ : $ARGUMENTS

Lis chaque fichier existant avant de le modifier.

## Les 8 couches (toutes obligatoires)

**1. Migration** — `node ace make:migration add_<field>_to_<resource>s`

- `alterTable` avec `.nullable()` ou `.defaultTo()` — jamais `.notNullable()` sans défaut sur table existante
- `down()` avec `dropColumn('<field>')`

**2. `app/models/<resource>.ts`** — ajouter la déclaration `@column`

- Date : `@column.date() declare <field>: DateTime | null`
- String : `@column() declare <field>: string | null`
- Enum : `@column() declare <field>: '<v1>' | '<v2>' | null`

**3. `app/validators/<resource>.ts`** — ajouter dans create **et** update validator

- `vine.date().nullable().optional()` / `vine.string().trim().nullable().optional()` / `vine.enum([…]).nullable().optional()`
- Si le validator utilise `vine.create(vine.object({…}))`, ajouter à l'intérieur de l'objet

**4. `shared/types/<resource>.ts`** — ajouter dans `<Resource>Payload` (et toute interface pertinente)

**5. `app/transformers/<resource>_transformer.ts`** — ajouter dans **toutes** les fonctions qui exposent la ressource

- Date : `<field>: item.<field> ? item.<field>.toISODate() : null`
- Vérifier `toEditForm`, `toShowProps`, et toute autre fonction du transformer

**6. Pages form Vue — `inertia/pages/<resource>s/new.vue` et `edit.vue`**

- Ajouter le champ dans le formulaire avec label via `t('<resource>.fields.<field>')`
- Si `show.vue` affiche les détails, ajouter l'affichage
- Zéro texte en dur, max 250 lignes

**7. i18n — `resources/lang/fr/<resource>.json` et `resources/lang/en/<resource>.json`**

- Ajouter sous `fields` dans les deux fichiers simultanément
- Si enum avec valeurs affichées : ajouter aussi les clés pour chaque valeur

**8. `docs/changelog.md`** — entrée en tête :

```
## YYYY-MM-DD — Ajout champ `<field>` sur `<resource>`
- migration alter, model, validator, shared types, transformer, pages form, i18n fr+en
```

## Checklist

- [ ] `node ace migration:run` OK
- [ ] `npx tsc --noEmit` OK
- [ ] `npx vue-tsc --noEmit --project inertia/tsconfig.json` OK
- [ ] Champ dans create **et** update validator
- [ ] Champ dans **toutes** les fonctions du transformer
- [ ] i18n fr + en mis à jour
- [ ] Changelog mis à jour
