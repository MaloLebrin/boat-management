# 2026-09-07 — Le copilote FleetAi devient un agent actionnable : neuf actions confirmables

Le copilote ne se contente plus de proposer des tâches de maintenance : il peut désormais proposer **neuf actions** sur les données de l'organisation — planifier une tâche (`create_task`, existant), ajouter des heures moteur (`add_engine_hours`), ouvrir et clôturer une sortie au journal de bord (`start_trip`, `close_trip`), enregistrer un plein (`log_fuel`), déclarer un incident (`report_incident`), créer une réservation (`create_reservation`) ou une fiche client (`create_client`), mettre à jour le stock d'une pièce moteur (`set_part_stock`).

## Principes

- **Le modèle n'écrit jamais rien** : chaque action est une proposition (`{"type":"propose_action","action":{"kind":…}}`), validée côté serveur (ids prouvés dans l'organisation via le roster ou des requêtes bornées) puis stockée dans `pending_action`. L'écriture n'a lieu qu'au clic **Confirmer**, sans aucun payload client, derrière le Bouncer du kind sur l'entité rechargée. L'ancienne forme `propose_task` reste acceptée (alias).
- **Gardes par action** (`ASSISTANT_ACTION_META`) : capability du rôle ET flag de plan effectif, filtrant à la fois les actions décrites au modèle, la validation, le bouton Confirmer et l'exécution (le plan est re-vérifié au confirm).
- **Journal d'audit** : chaque action confirmée est journalisée (`engine.add_hours`, `navigation_log.create`, `fuel_log.create`, `incident.create`, `reservation.create`, `client.create`, `engine_part.set_stock`) avec libellés FR/EN dans le journal d'activité.
- **Compatibilité** : les `pending_action` stockés avant cette itération (sans champ `kind`) sont lus comme des propositions de tâche — aucune migration.

## Fichiers principaux

- `shared/types/assistant.ts` : `ASSISTANT_ACTION_KINDS`, `ASSISTANT_ACTION_META`, union `AssistantPendingAction`, cartes `action_done`/`action_dismissed`.
- `app/services/assistant_actions_service.ts` (nouveau) : registre validation/autorisation/exécution par kind.
- `app/services/assistant_prompt_service.ts` : contrat `propose_action`, lignes d'actions par kind (`buildActionLines`), parseurs par kind.
- `app/controllers/assistant_controller.ts` : confirmation générique + nouveaux cas d'erreur (action non autorisée, entité disparue, sortie déjà en cours, règle métier rejetée).
- Front : `AssistantActionCard` générique + `AssistantActionSummary`, cartes de résultat dans `AssistantMessage`, clés i18n `assistant.json`/`flash.json`/`settings.json` (deux locales).
