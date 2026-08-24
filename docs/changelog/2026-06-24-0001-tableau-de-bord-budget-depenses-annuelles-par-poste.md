# 2026-06-24 — Tableau de bord budget (dépenses annuelles par poste)

Nouvelle page **Budget** accessible depuis la fiche de chaque bateau (bouton « Budget »).

**Fonctionnalités :**

- Vue agrégée des dépenses par poste : maintenance, carburant, documents/assurance, port (à venir)
- Sélecteur d'année avec comparaison N-1 (delta %)
- Graphique barres empilées mensuel (chart.js + vue-chartjs)
- Export CSV du budget annuel : `GET /boats/:id/export/budget.csv?year=YYYY`
- Champ `cost` ajouté à `boat_documents` (migration + validator + service)

**Routes :**

- `GET /boats/:id/budget` — page budget (paramètre `?year=YYYY` optionnel, défaut = année courante)
- `GET /boats/:id/export/budget.csv` — export CSV du budget annuel

**Sources de données :**

- Maintenance : `SUM(boat_maintenance_parts.unit_price × quantity)` groupé par mois
- Carburant : `SUM(boat_fuel_logs.total_cost)` groupé par mois
- Documents : `SUM(boat_documents.cost)` groupé par mois (date de `issued_at`)
- Port : non disponible en V1, affiché comme « à venir »
