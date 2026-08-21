# 2026-05-18

## Analyse IA (Mistral) — Dashboard et fiche bateau

- Panneau IA du dashboard : bouton "Analyser la flotte" desormais fonctionnel — genere des suggestions Mistral basees sur l'etat reel de la flotte (bateaux, maintenances urgentes, stats)
- Panneau IA de la fiche bateau (onglet Vue d'ensemble) : bouton "Actualiser" genere des suggestions specifiques au bateau (moteurs, voiles, securite, taches en retard)
- Les analyses sont cachees en base (`ai_analyses`) et servies sans re-appel Mistral au rechargement de page
- Nouveaux endpoints : `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions`

---
