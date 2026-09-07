# Copilote FleetAi : une proposition de tâche sans échéance ne casse plus le chat

**Date** : 2026-09-07

## Contexte

Une demande aussi banale que « ajoute une révision moteur sur le 3D » (sans date) faisait échouer le tour de chat : toast « L'assistant a renvoyé une réponse inexploitable », message de l'utilisateur perdu, rien de persisté.

Cause : le modèle comprend la demande mais lui manque l'échéance, alors il emballe sa **question de clarification** dans une réponse `propose_task` dont `dueAt` et `dueEngineHours` valent tous les deux `null` :

```json
{"type":"propose_task","message":"Pouvez-vous préciser la date ou le nombre d'heures moteur ?","task":{"boatId":22,"dueAt":null,"dueEngineHours":null, …}}
```

`parseAssistantReply` levait `AiInvalidResponseError` sur ce cas, et `AssistantController` le traduit en flash `flash.assistant.invalidResponse`. Reproduit sur le vrai roster avec `mistral-small-latest` : 1 échec sur 10 questions réalistes, systématique dès qu'une création de tâche est demandée sans date.

## Modification

`app/services/assistant_prompt_service.ts` :

- **Tolérance dans le parser** : une `propose_task` sans `dueAt` ni `dueEngineHours` est dégradée en `{ type: 'answer', message }` au lieu de lever. Le fil continue, l'utilisateur répond avec l'échéance. Aucune donnée n'est écrite (une proposition sans échéance serait de toute façon refusée par `BoatMaintenanceTaskService.createForBoat`).
- **Prompts durcis** (FR + EN) : nouvelle règle explicite interdisant d'émettre un `propose_task` dont les deux champs d'échéance sont `null`.

Les autres invariants restent stricts : sujet inconnu, date illisible, id absent du roster, type inconnu ou JSON invalide lèvent toujours `AiInvalidResponseError` sans rien persister.

## Tests

- `tests/unit/services/assistant_prompt_service.spec.ts` (nouveau, 16 cas) : parsing des trois formes, dégradation de la proposition sans échéance, rejets, et construction du prompt système (roster, troncature, prompt personnalisé de l'org).
- `tests/functional/assistant/assistant_chat.spec.ts` : nouveau cas — une proposition sans échéance poursuit le fil en réponse simple, sans `pendingAction`, sans flash d'erreur.

## Comportements notables

- Vérifié en conditions réelles : les trois formulations qui échouaient (« ajoute une révision moteur sur le 3D », « planifie un antifouling sur le 3D », « crée une tâche de contrôle du gréement ») repartent en `answer` demandant l'échéance.
- Aucune migration, aucune clé i18n, aucune route modifiée.
