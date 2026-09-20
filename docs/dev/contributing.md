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

## Dépendances et overrides (#765)

`pnpm audit` remonte surtout du bruit : la quasi-totalité des avis porte sur
des dépendances **transitives** d'outillage de test et de build, exécutées sur
nos propres sources. Avant de bumper quoi que ce soit, trier ce qui est
réellement dans le **chemin d'exécution** — aujourd'hui `axios` (bundle
client), `nodemailer` (contenus fournis par l'utilisateur) et `ws` (appels IA).

Deux règles pour les overrides :

1. **Ils vivent dans `pnpm-workspace.yaml`, pas dans `package.json`.** Depuis
   pnpm 10, le champ `pnpm` de `package.json` n'est plus lu ; pnpm 12 le
   signale au `install` mais l'override est bel et bien ignoré. Toujours
   vérifier la version réellement résolue (`pnpm-lock.yaml`) après coup plutôt
   que de faire confiance au fichier édité.
2. **Un override porte sa condition de retrait**, en commentaire. Un override
   non commenté survit à la version qui le rendait inutile. Préférer d'abord
   un **bump du paquet intermédiaire** quand il existe : c'est le chemin
   supporté (`@adonisjs/mail@10.4.0` déclare `nodemailer ^9.0.3`, là où un
   override aurait forcé une majeure hors de la plage déclarée).

Après un bump transitif : `pnpm lint`, `tsc -b`, `pnpm test`, `pnpm
test:inertia`, **et** `pnpm run build` + `pnpm check:sw` — un paquet qui part
dans le bundle client ne se valide pas avec les seuls tests backend.
