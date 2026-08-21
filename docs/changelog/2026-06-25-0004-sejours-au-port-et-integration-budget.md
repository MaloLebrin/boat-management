# 2026-06-25 — Sejours au port et integration budget

Ajout de la gestion des sejours au port avec cout, integree dans le tableau de bord budget annuel.

- Table `boat_port_stays` : `port_name`, `started_at`, `ended_at`, `cost`, `notes`
- Modele `BoatPortStay` avec relation `belongsTo` vers `Boat`
- Service `BoatPortStayService` : `listForBoat`, `create`, `delete`
- Controller `BoatPortStayController` : `store`, `destroy`
- Routes : `POST /boats/:id/port-stays`, `DELETE /boats/:id/port-stays/:stayId`
- `BudgetService` : nouvelle methode `fetchPortByMonth` ; `port` ajoute a `BudgetMonthlyData` et `BudgetYearSummary`
- Export CSV budget : colonne `port` ajoutee
- Frontend : `BudgetPortStayForm.vue` (formulaire useForm), `BudgetPortStayList.vue` (liste avec suppression)
- Page budget : categorie Port active avec total et comparaison N-1
- Graphique mensuel : dataset Port en couleur teal
- i18n : cles `budget.portStay.*` et `flash.portStay.*` en FR et EN
- Policy `BoatPolicy.manage` pour controler les droits de gestion
