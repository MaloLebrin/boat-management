# Changelog

Toutes les nouvelles fonctionnalités, améliorations et correctifs notables. **Un fichier par modification** — jamais d'insertion dans un fichier partagé, pour éliminer les conflits git entre branches.

## Convention

- **Nom de fichier** : `YYYY-MM-DD-HHMM-slug.md`
  - `YYYY-MM-DD` : date de la modification.
  - `HHMM` : heure et minute de rédaction de l'entrée (ex. `1435`) — garantit l'ordre chronologique dans la journée sans collision. Les 276 entrées migrées depuis l'ancien `docs/changelog.md` (heure inconnue) portent un compteur `0001`, `0002`… à la place.
  - `slug` : titre en kebab-case sans accents, ~60 caractères max, sans le numéro d'issue.
- **Contenu** : un titre h1 `# YYYY-MM-DD — Titre (#issue)`, un paragraphe de contexte, puis des puces en gras (**Cause**, **Correctif**, **Tests**…) — même format qu'avant, en français.
- **Lecture chronologique** : `ls -r docs/changelog/` (le nommage trie naturellement du plus ancien au plus récent).

## Exemple

```
docs/changelog/2026-08-21-1435-fiche-bateau-500-suggestions-ia.md
```

```markdown
# 2026-08-21 — Fiche bateau : plus de 500 sans suggestion IA (#478)

Repéré sur la sandbox démo…

- **Cause.** …
- **Correctif.** …
- **Tests.** …
```
