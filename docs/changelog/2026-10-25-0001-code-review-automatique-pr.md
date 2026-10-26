# Code review automatique des PR par Claude

> Date : 2026-10-25

Nouveau workflow GitHub Actions `.github/workflows/claude-review.yml`.

- Déclenché sur `pull_request` (`opened`, `reopened`, `ready_for_review`) ; ignoré tant que la PR est en draft.
- Relance à la demande : ajouter le label `claude-review` à la PR. Pas de relance à chaque push (coût).
- Pas de run pour les PR venant d'un fork ni de Dependabot (le secret n'y est pas disponible), ni quand la PR ne touche que `**/*.md`, `pnpm-lock.yaml` ou `.adonisjs/**`.
- Utilise `anthropics/claude-code-action` (épinglée sur un SHA) : commentaires inline + résumé dans le commentaire de suivi de l'action, en français. Le format du résumé (bloquants / importants / suggestions / points positifs / score) est décrit dans le prompt du workflow.
- La review est consultative : ne pas l'ajouter aux checks requis de la protection de branche.
- Une review en cours n'est annulée que par un nouveau run réel sur la même PR (concurrence au niveau du job).
- Garde-fous : outils limités à la lecture et aux commentaires inline, `--max-turns 30`, contenu de la PR traité comme non fiable.
- Prérequis : secret de dépôt `ANTHROPIC_API_KEY` et app GitHub Claude installée sur le repo.
