# Site marketing : promesses alignées sur le produit (#866)

**Date :** 27/09/2026

## Contexte

Le site marketing vendait des fonctionnalités qui n'existent pas, ou seulement en partie : SSO/SCIM, assignation des tâches à l'équipe, glisser-déposer au planning, report en un clic, indisponibilités croisées avec les réservations, rapports hebdomadaires ou mensuels automatiques, import Google Sheets/Airtable, API publique, app mobile « complète », rôles « granulaires » différents selon le plan, statut bateau partageable, et « 90 jours pour exporter en CSV » alors que le plan Starter bloque l'export CSV.

## Décision

Tout ce qui n'est pas livré est **retiré ou reformulé** dans `resources/lang/{fr,en}/marketing.json`, avec une formulation que le produit tient aujourd'hui. Aucune structure de page n'a changé : chaque clé garde sa place et reçoit un texte vrai.

| Promesse retirée                                                         | Remplacée par (ce qui existe)                                                                                                      |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| SSO & SCIM (Entreprise)                                                  | Rôles & permissions : 4 rôles, accès cloisonné par organisation                                                                    |
| Assignation à l'équipe, réassignation en glisser-déposer, vue par membre | Vues kanban et calendrier, regroupement des tâches proches (Pro)                                                                   |
| Report en un clic                                                        | Tâche marquée faite en un clic, échéance suivante recalculée                                                                       |
| Indisponibilités visibles avant d'engager un bateau                      | Entretiens planifiés visibles sur le planning ; la FAQ précise que le croisement avec les réservations n'existe pas encore         |
| Rapport hebdomadaire / mensuel automatique                               | Urgences triées par gravité sur le tableau de bord ; carnet d'entretien PDF                                                        |
| Import Excel, Google Sheets, Airtable, PDF ; « importe ta flotte »       | Import d'historique CSV/Excel (Entreprise) et de dépenses CSV (Pro) ; bateaux et équipements créés dans l'app                      |
| 90 jours pour exporter en CSV/PDF après résiliation                      | Données conservées sur Starter, carnet PDF toujours téléchargeable, export CSV réservé au plan Pro, suppression sur demande (RGPD) |
| Intégration sur mesure : API custom, plateforme de réservation           | Connecteur vers les outils existants, étudié et développé sur demande (sur devis)                                                  |
| App mobile complète / App iOS-Android (page À propos)                    | Application installable sur mobile, mode hors-ligne (PWA)                                                                          |
| Rôles « basique » / « avancé »                                           | 4 rôles, identiques en Pro et Entreprise                                                                                           |
| Statut bateau partageable avec les moniteurs                             | Checklists d'inspection sur le ponton, même hors-ligne                                                                             |
| API publique (page À propos)                                             | Retirée                                                                                                                            |

Les fonctionnalités retirées gardent leurs issues de construction : elles ne reviennent sur le site qu'une fois livrées.

## Garde-fous

- `tests/functional/marketing/feature_claims.spec.ts` relit `marketing.json` dans les deux locales et échoue si l'une des formulations retirées réapparaît.
- Les fixtures `props_snapshot` (home, pricing, about, help) sont régénérées.
- `docs/process/pr-checklist.md` : toute PR qui ajoute une promesse marketing cite la route ou l'écran qui la tient.
- `shared/constants/assistant/product_knowledge.ts` ne contenait aucune de ces promesses : rien à changer.
