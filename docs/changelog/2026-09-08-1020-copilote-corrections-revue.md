# Copilote actionnable — corrections de revue

**Date** : 8 septembre 2026

Correctifs sur l'agent actionnable (#642) relevés en revue de la PR 644, avant fusion.

## Fuseau horaire des actions datées

Le panneau joint désormais `tzOffsetMinutes` (`Date#getTimezoneOffset()`) à chaque message, comme les formulaires manuels. L'offset est recopié dans l'action stockée en `pending_action` — la confirmation n'accepte aucun payload — puis repassé aux services à l'exécution.

Sans lui, l'heure locale annoncée au modèle était écrite telle quelle en UTC : une réservation proposée 14 h → 18 h pour un utilisateur en UTC+2 était enregistrée à 14:00 UTC, réaffichée 16 h → 20 h, et la détection de conflit comparait une fenêtre décalée de deux heures.

- Corps accepté par `POST /assistant/conversations` et `…/messages` : `tzOffsetMinutes` entier optionnel, borné à [-840, 720].
- Champ `tzOffsetMinutes` ajouté aux actions `start_trip`, `close_trip`, `report_incident` et `create_reservation`.

## Validation des dates alignée sur l'écriture

Le parse validait avec `Date.parse`, bien plus permissif que le `DateTime.fromISO` utilisé à l'écriture. Une date comme « 2026-09-07 14:30 » passait la validation, s'affichait sur la carte, puis cassait à la confirmation (`departed_at` est `NOT NULL`). Les dates sont maintenant validées avec Luxon.

## Clôture de sortie liée à la sortie proposée

`close_trip` reprenait « la » sortie en cours du bateau sans la comparer au `logId` de la proposition : si la sortie visée était clôturée ailleurs et une autre ouverte entre-temps, la confirmation appliquait à cette dernière le port d'arrivée, la distance et les heures moteur de la carte. La confirmation lève désormais `AssistantActionEntityGoneError` quand la sortie en cours n'est plus celle proposée.

## Proposition inexécutable : le fil continue

Proposer `close_trip` alors qu'aucune sortie n'est ouverte est un état normal de la flotte, pas une réponse malformée. Le tour n'est plus jeté avec le flash générique `invalidResponse` : `AssistantActionNotExecutableError` est dégradée en réponse serveur qui explique le blocage.

## Bouton Confirmer et flag de plan

La carte ne testait que la capability du rôle. Une proposition `create_reservation` sur un plan sans `canManageReservations` affichait un bouton actif qui échouait au clic. Le flag de plan effectif est désormais testé côté carte, comme côté serveur.

## Requêtes

- `AssistantActionsService.allowedKindsFor` résout le rôle une seule fois au lieu de neuf `hasPermission` (un `SELECT` chacun), et la validation de proposition réutilise les quotas déjà calculés par le tour : 18 requêtes d'adhésion en moins par message aboutissant à une proposition.
- Nouveau `PlanningService.countDueTasksForOrg` : les suggestions de démarrage n'ont besoin que de deux nombres et ne construisent plus tout le planning (tâches terminées, total, groupes).

## Pluriel des suggestions

Les chips « tâches en retard » / « bientôt dues » passent en pluriel ICU dans les deux locales (« 1 tâches » auparavant).
