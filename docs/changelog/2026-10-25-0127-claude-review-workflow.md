# 2026-10-25 — Code review automatique des PR par Claude Code

Les PR n'avaient pas de relecture automatisée. Un workflow GitHub Actions fait désormais relire chaque PR par Claude Code et poste le résultat directement sur la PR.

- **Workflow.** `.github/workflows/claude-review.yml` (job `review`, `anthropics/claude-code-action@v1`, `track_progress: true`, timeout 20 min).
- **Déclencheurs.** `pull_request` sur `opened`, `reopened`, `ready_for_review`, uniquement si la PR n'est pas en draft. Pas de `synchronize`, pour limiter les coûts. Une `concurrency` par numéro de PR annule la review en cours si une nouvelle démarre.
- **Contenu de la review.** Lecture de `CLAUDE.md` en référence, puis commentaires inline pour les remarques précises et un seul résumé via `gh pr comment`, en français, au format de `.claude/agents/reviewer.md` : 🔴 bloquants, 🟠 importants, 🟡 suggestions, ✅ points positifs, score /10. Bugs, sécurité, performance, architecture et tests manquants ; pas de commentaire sur ce que couvrent ESLint/Prettier.
- **Outils autorisés.** Commentaires inline, `gh pr comment|diff|view`, `Read`, `Grep`, `Glob` — lecture seule.
- **Prérequis.** Secret de dépôt `ANTHROPIC_API_KEY` et app GitHub Claude installée sur le dépôt (`/install-github-app`).
- **Relance.** Repasser la PR en draft puis en « Ready for review ».
