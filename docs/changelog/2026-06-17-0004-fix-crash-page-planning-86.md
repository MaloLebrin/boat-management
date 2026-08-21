# 2026-06-17 — Fix : crash page Planning #86

**Frontend**

- `inertia/components/planning/PlanningTaskCard.vue` — remplacement de `:route="\`/boats/${task.boatId}\`"`par`route="boats.show" :params="{ id: task.boatId }"`sur`BaseButton`. La prop `route`attend un nom de route Tuyau, pas un chemin URL ; passer un chemin URL appelait`tuyau.getRoute('/boats/:id')`au rendu et levait`Error: Route /boats/:id not found`, faisant crasher toute la page Planning dès l'ouverture.
- `inertia/components/planning/PlanningCalendar.vue` — même correctif sur le bouton "Planifier" de la section tâches sans date.

---
