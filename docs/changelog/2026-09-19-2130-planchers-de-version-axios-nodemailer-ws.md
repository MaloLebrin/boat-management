# 2026-09-19 — Planchers de version sur axios, nodemailer et ws (#765)

`pnpm audit` remontait **62 avis** : 34 high, 26 moderate, 2 low. Tous sur des
dépendances transitives — aucune dépendance directe du `package.json` n'était
visée. Le volume brut était trompeur : la majorité concerne l'outillage de test
et de build.

- **Le tri.** Trois paquets seulement sont réellement dans le chemin
  d'exécution : `axios` (part dans le bundle client, via `@inertiajs/*` et
  `laravel-precognition`), `nodemailer` (traite des adresses et des contenus
  fournis par l'utilisateur, via `@adonisjs/mail`) et `ws` (sur tous les appels
  IA, via `@mistralai/mistralai`). Le reste — `@faker-js/faker`, `form-data`,
  `qs`, `brace-expansion`, `vitest`, `postcss`, `nanoid`, `esbuild` — ne tourne
  qu'en test ou à la compilation, sur nos propres sources.
- **Correctif.** `@adonisjs/mail` passe de `^10.3.0` à `^10.4.0` : c'est la
  première version qui déclare `nodemailer: ^9.0.3`, donc le chemin **supporté**
  vers nodemailer 9 plutôt qu'une majeure forcée hors de la plage déclarée.
  S'y ajoutent trois planchers de version en `overrides`, chacun **à
  l'intérieur** de la plage déclarée par le paquet qui dépend :
  `axios >=1.18.0 <2`, `nodemailer >=9.1.1 <10`, `ws >=8.21.0 <9`.
- **Emplacement des overrides.** Ils vivent dans `pnpm-workspace.yaml`, pas
  dans le champ `pnpm` de `package.json` : depuis pnpm 10 ce champ n'est plus
  lu, et pnpm 12 le signale explicitement au `install`
  (« The "pnpm" field in package.json is no longer read by pnpm »). Un override
  posé là aurait été **ignoré en silence** du point de vue du résultat — c'est
  d'ailleurs ce qui est arrivé au premier essai.
- **Résultat mesuré.** 62 avis → **30** ; 34 high → **20**. `axios`,
  `nodemailer` et `ws` sont à **zéro avis**. Les 30 restants sont l'outillage
  de test et de build, laissé pour un second temps comme le prévoit l'issue.
- **Chaque override porte sa condition de retrait**, en commentaire au-dessus :
  un override non commenté survit à la version qui le rendait inutile.
- **Vérifications.** `tsc -b`, `pnpm lint`, `pnpm test:inertia` (2 539),
  `node ace test unit integration` (1 574), `node ace test functional`,
  `pnpm run build` et `pnpm check:sw` — l'ensemble passe. Le build et le
  garde-fou service worker comptent particulièrement ici : `axios` part dans
  le bundle client et `laravel-precognition` est dans la boucle de validation
  des formulaires.
