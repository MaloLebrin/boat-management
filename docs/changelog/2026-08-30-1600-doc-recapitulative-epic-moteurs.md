# 2026-08-30 — Doc récapitulative de l'épic Moteurs (#572)

Les 4 sous-issues de l'épic « catalogue moteurs in-bord et hors-bord, pièces et diagnostic »
(#573, #574, #575, #576) sont livrées et mergées ; cette entrée clôt l'épic, sur le modèle de
celle de l'épic #481.

- **`docs/architecture/moteurs-epic-572.md`** (nouveau) : tableau des livraisons avec liens PR
  (#593, #594, #600, #618) et des suivis (#615, #606, alias de marques), décisions structurantes
  (invariant du texte libre, deux vocabulaires de familles, éligibilité décidée par le contenu,
  `source_label` NOT NULL, clés persistées jamais renommées, prompt IA par famille) et
  **vérification des critères d'acceptation** de l'épic — pas de plan de merge ici, tout est déjà
  sur `main`.
- **`docs/domain/spare-parts.md`** : les checklists de diagnostic in-bord quittent la section
  « Hors périmètre » — elles sont livrées par #576 (`docs/domain/diagnostic.md`).
