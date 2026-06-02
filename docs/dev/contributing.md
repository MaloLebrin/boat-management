# Contribuer

## Principes

- **Controllers fins**: l’orchestration HTTP (auth/ACL/validation/redirect) reste dans `app/controllers/**`.
- **Services**: la logique métier vit dans `app/services/**`.
- **Validation**: VineJS dans `app/validators/**`.
- **Migrations**: créer de nouvelles migrations, ne pas “réécrire l’historique”.
- **Tests**: ajouter des unit tests pour toute logique métier nouvelle ou modifiée.

## Où mettre quoi

- **Routes**: `start/routes/**/*.ts`
- **Controllers**: `app/controllers/**`
- **Services**: `app/services/**`
- **Models**: `app/models/**`
- **Inertia**: `inertia/pages/**` et `inertia/components/**`
- **Docs**: `docs/**` (mise à jour requise par PR)
