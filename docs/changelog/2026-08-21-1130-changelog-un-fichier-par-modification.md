# 2026-08-21 — Changelog : un fichier par modification dans `docs/changelog/`

`docs/changelog.md` (3 950 lignes, 276 entrées) imposait que chaque PR insère son entrée en tête du même fichier : point de conflit git structurel (234 commits, toute paire de branches concurrentes conflictait). Le fichier unique est remplacé par le dossier `docs/changelog/` avec **un fichier par modification**.

- **Convention** : `YYYY-MM-DD-HHMM-slug.md` (`HHMM` = heure de rédaction), contenu en h1 `# YYYY-MM-DD — Titre (#issue)` puis corps au format habituel — détaillée dans `docs/changelog/README.md`.
- **Migration** : les 276 entrées historiques ont été éclatées en fichiers individuels par script (round-trip vérifié, zéro perte de contenu). Heure inconnue → compteur par jour `0001`, `0002`… dans le slot `HHMM`. Titres promus d'un niveau (`##` → `#`, `###` → `##`), l'ancien `docs/changelog.md` est supprimé.
- **Références mises à jour** : `CLAUDE.md` (règle « Documentation obligatoire »), `README.md`, `docs/README.md` (index), `docs/quotas.md`, `docs/domain/notifications.md`, `docs/offre-modulaire.md` et les skills `.claude/skills/{new-domain,add-field,new-vue-page,new-event-listener,new-job}.md`.
- **Attention branches ouvertes** : toute branche qui modifie encore `docs/changelog.md` subira un conflit modify/delete au rebase — son entrée devra être recréée en fichier individuel.
