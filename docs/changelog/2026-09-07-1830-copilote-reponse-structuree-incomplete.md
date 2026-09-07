# Copilote FleetAi : une réponse structurée incomplète ne casse plus le chat

**Date** : 2026-09-07

Suite de `2026-09-07-1715-copilote-proposition-sans-echeance.md`, qui ne corrigeait qu'un cas particulier d'un défaut plus large.

## Contexte

Après le correctif précédent, « quelle est la liste des pièces pour faire l'entretien du moteur » produisait toujours le toast « L'assistant a renvoyé une réponse inexploitable » — message de l'utilisateur perdu, rien de persisté.

Même cause de fond : le modèle **a compris la demande mais il lui manque un élément** (quel bateau ? quel moteur ? quelle échéance ?). Plutôt que de retomber sur `answer`, il emballe sa **question de clarification** dans une forme structurée dont les champs manquants valent `null` :

```json
{"type":"handoff","message":"Lequel des deux moteurs ?","target":"part_search","boatId":22,"engineId":null}
{"type":"handoff","message":"Quel bateau et quel moteur ?","target":"part_search"}
```

`toId` levait `AiInvalidResponseError` sur l'id absent, et `AssistantController` le traduit en flash `flash.assistant.invalidResponse`. Le `message` du modèle était pourtant parfaitement affichable. Corriger le cas `propose_task` sans traiter `handoff` ne pouvait donc que déplacer le symptôme.

## Modification

`app/services/assistant_prompt_service.ts` — une règle unique remplace le traitement au cas par cas :

- **Incomplet ≠ cassé.** Une forme structurée dont un champ est absent (`null`/`undefined`) est dégradée en `{ type: 'answer', message }`. Le fil continue, l'utilisateur complète, rien n'est écrit. Concerné : une proposition de tâche (`propose_action` + `kind: create_task`, ou son alias de compat `propose_task`) sans objet d'action, sans `subject`, sans `title`, sans `boatId` ou sans échéance ; `handoff` sans `target`, sans `boatId` ou sans `engineId`.
- **Reste fatal** : JSON invalide, `message` vide, `type` inconnu, et toute valeur **présente mais fausse** — sujet hors liste, date illisible, id non entier, cible de handoff inconnue. Là, le modèle contredit le contrat.
- La validation d'appartenance des ids au roster (anti-hallucination, `AssistantChatService`) est inchangée : un id inventé lève toujours et ne persiste rien.
- **Prompts durcis** (FR + EN) : la règle interdit désormais toute forme structurée incomplète, action proposée comme `handoff`, et renvoie la demande de précision vers `answer`.

## Tests

- `tests/unit/services/assistant_prompt_service.spec.ts` : les dégradations (proposition de tâche et `handoff` incomplets), les rejets (sujet hors liste, id non entier), et la règle dans les deux prompts système.
- `tests/functional/assistant/assistant_chat.spec.ts` : un handoff sans moteur poursuit le fil en réponse simple, sans carte et sans flash d'erreur.

## Comportements notables

- Vérifié en conditions réelles (`mistral-small-latest`, roster réel) sur six formulations, dont les quatre variantes autour de la liste des pièces : toutes repartent en réponse exploitable.
- Aucune migration, aucune clé i18n, aucune route modifiée.
