# 2026-09-18 — L'image Docker n'était plus construite depuis cinq merges

Le workflow `Docker` échouait à **chaque** merge sur `main` — runs 401 à 405, sans exception — donc
l'image de production n'était ni construite ni poussée sur ghcr.io. La CI, elle, était verte à chaque
fois : rien ne signalait la panne.

- **Cause.** `package.json` déclare `"prepare": "husky"`, et `husky` est une **devDependency**.
  L'étape `runner` du Dockerfile installe avec `pnpm install --prod --frozen-lockfile`, donc sans les
  devDependencies — mais pnpm exécute quand même le script `prepare`, qui ne trouve pas le binaire :

  ```
  . prepare$ husky
  . prepare: sh: husky: not found
  ╰─▶ /app prepare: `husky` exited with exit status: 127
  ```

  L'étape `RUN` du `Dockerfile:33` sortait donc en erreur et le build s'arrêtait là.

- **Correctif.** `"prepare": "husky || true"`. Le seul échec ainsi rendu silencieux est précisément
  celui qu'on veut ignorer : husky absent parce qu'on installe sans les devDependencies. Vérifié que
  le script reste actif en développement — `pnpm prepare` installe toujours les hooks
  (`core.hooksPath` = `.husky/_`, `pre-commit` en place).

## Pourquoi personne ne l'a vu

`.github/workflows/docker.yml` se déclenche sur `workflow_run` **depuis la CI de `main`**, donc
uniquement **après** un merge. Le build d'image n'est jamais exercé sur une pull request : ni la
panne, ni ce correctif ne peuvent apparaître dans la CI d'une PR. La seule preuve viendra du premier
run sur `main` après ce merge.

C'est le vrai défaut de fond, et il dépasse ce correctif : **un pipeline de déploiement qui n'est
testé qu'après coup casse en silence.** Le faire aussi tourner sur les PR — en construisant sans
pousser — le rendrait visible avant le merge plutôt que cinq merges plus tard. Signalé ici, pas
traité : cette entrée corrige la panne, pas le dispositif qui l'a laissée passer.
