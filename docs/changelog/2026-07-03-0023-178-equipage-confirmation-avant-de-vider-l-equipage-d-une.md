# 2026-07-03 — [#178] Équipage : confirmation avant de vider l'équipage d'une sortie

**Corrige D-03 : un payload `crew` vide vide tout l'équipage d'un log via `sync({})`. Le vidage est en réalité un geste légitime (retirer le dernier équipier), donc plutôt que de l'interdire (`.minLength(1)` aurait rendu le dernier équipier non-retirable), on le protège d'un clic accidentel par une confirmation**

- `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue` : `removeCrewMember()` demande une confirmation (`crew.logCrew.removeLastConfirm`) quand le retrait laisserait la sortie sans aucun équipage
- `resources/lang/en/crew.json` et `fr/crew.json` : nouvelle clé `crew.logCrew.removeLastConfirm`
- `app/services/crew_service.ts` : commentaire clarifiant que le vidage explicite est intentionnel et ne doit pas être interdit côté validator (le champ `crew` est déjà requis, donc une requête malformée qui l'omet est déjà rejetée — pas de perte silencieuse)
- Tests ajoutés :
  - backend `tests/functional/boats/navigation_log_crew.spec.ts` (un `crew: []` explicite vide bien l'équipage ; une requête sans champ `crew` est rejetée et conserve l'équipage existant)
  - frontend `tests/inertia/navigation_log_crew_panel.spec.ts` (confirmation demandée avant de retirer le dernier équipier ; pas de soumission si annulé, soumission si confirmé)
