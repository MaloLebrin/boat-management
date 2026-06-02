# PR checklist (docs & qualité)

## Checklist reviewer

- [ ] La PR décrit le **pourquoi** + l’impact utilisateur.
- [ ] Si la PR change une feature: `docs/` est mis à jour (domain + UI map).
- [ ] Si la PR change la DB: `docs/data/schema.md` est mis à jour.
- [ ] Les contrôleurs restent **fins** (logique dans services).
- [ ] Tests ajoutés/ajustés si logique métier.

## Checklist auteur

- [ ] J’ai mis à jour la doc liée à ma feature.
- [ ] J’ai vérifié les routes impactées (mapping routes→controller→service→page).
- [ ] J’ai lancé `pnpm test` et/ou `pnpm test:inertia` si pertinent.
