# Garder la documentation à jour

## Principe

Chaque modification fonctionnelle ou technique doit être accompagnée d’une mise à jour de `docs/`.

## Quand mettre à jour la doc

- **Routes / Controllers / Services**: mettre à jour la section “mapping” du domaine concerné dans `docs/domain/**`.
- **UI Inertia (pages/composants)**: mettre à jour `docs/frontend/ui-map.md` + le domaine.
- **DB / migrations**: mettre à jour `docs/data/schema.md`.
- **Auth / ACL**: mettre à jour `docs/domain/auth-acl.md`.

## Definition of Done (DoD)

Une PR n’est pas mergeable si:

- elle change un comportement utilisateur (ou une règle métier) **sans** mettre à jour la doc
- elle change le schéma DB **sans** mettre à jour `docs/data/schema.md`

## Ownership

La règle est volontairement simple (process-only):

- la **personne** qui implémente la feature met à jour la doc
- le **reviewer** vérifie la checklist `docs/process/pr-checklist.md`

