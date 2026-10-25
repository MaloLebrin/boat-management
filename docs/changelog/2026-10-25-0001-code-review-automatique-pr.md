# Code review automatique des PR par Claude

> Date : 2026-10-25

Nouveau workflow GitHub Actions `.github/workflows/claude-review.yml`.

- Déclenché sur `pull_request` (`opened`, `reopened`, `ready_for_review`) ; ignoré tant que la PR est en draft.
- Utilise `anthropics/claude-code-action@v1` : commentaires inline + résumé posté sur la PR, en français.
- Le prompt s'appuie sur `CLAUDE.md` et sur le format de `.claude/agents/reviewer.md`.
- Pas de relance à chaque push (coût) : repasser la PR en draft puis « Ready for review » pour relancer.
- Prérequis : secret de dépôt `ANTHROPIC_API_KEY` et app GitHub Claude installée sur le repo.
