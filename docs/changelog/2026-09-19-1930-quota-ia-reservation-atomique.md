# 2026-09-19 — Le quota de tokens IA tient entre processus (#776)

Le plafond mensuel de tokens par organisation était protégé contre les appels
concurrents par un mutex en mémoire. Le code le documentait lui-même comme
mono-processus, « à remplacer par Redis en cas de scale horizontal ».

- **Cause.** Ce n'était pas une limite théorique en attente d'un futur
  scale-out : le `package.json` déclare déjà deux workers de queue
  (`queue:work`, `queue:work:ai`) en plus du serveur web, et les appels au
  quota partent des deux côtés — requêtes HTTP (`assistant_chat_service`,
  `public_diagnosis_service`, `public_part_search_service`,
  `spare_part_chat_service`, `ai_analysis_service`) **et** jobs
  (`run_ai_chat`, `generate_ai_suggestions`). Chaque processus avait sa propre
  `Map` de verrous. La séquence protégée était un _read-modify-write_
  classique — lire la consommation du mois, vérifier, écrire plus tard — et la
  fenêtre de course était large comme un appel Mistral.
- **Correctif.** Une **réservation** portée par la base. Nouvelle colonne
  `reserved_tokens` sur `ai_token_usages` (migration avec `down()`).
  `reserveTokens(org)` pose 4 000 tokens par un `INSERT … ON CONFLICT DO
UPDATE … WHERE tokens_used + reserved_tokens + N <= limite` : zéro ligne
  affectée signifie « plafond atteint ». La vérification et l'écriture tiennent
  donc dans **une seule opération atomique**, la base devient la seule
  autorité, et le nombre de processus n'a plus d'influence.
  `withReservedTokens(org, fn)` encapsule réserver / exécuter / relâcher, et
  remplace le trio `withOrgLock` + `getUsage` + `assertCanUseTokens` sur les
  neuf sites d'appel.
- **Pourquoi une colonne distincte.** Réserver dans `tokens_used` aurait
  déclenché les seuils de notification (80 %, 100 %) sur une consommation qui
  n'a pas eu lieu, et les aurait fait rejouer après chaque libération. Les
  seuils, `getUsage()` et les statistiques continuent de ne lire que la
  consommation réelle.
- **Limite assumée.** Un processus tué en plein appel ne relâche pas sa
  réservation : elle reste comptée jusqu'à la remise à zéro mensuelle. La
  fuite est bornée à 4 000 tokens par appel interrompu (0,4 % du plafond Pro),
  et `clearReservations()` permet le rattrapage.
- **Le mutex en mémoire subsiste**, renommé `withBestEffortOrgLock`, mais
  uniquement pour le plafond de conversations à vie du plan starter, qui ne
  passe pas par le compteur de tokens. Son commentaire dit désormais
  franchement ce qu'il garantit : rien entre processus. Le corriger
  demanderait de tenir un verrou de base pendant tout un appel IA, pour un
  dépassement qui coûte une conversation, pas un budget Mistral.
- **Tests.** `tests/functional/quota/ai_token_quota.spec.ts` : deux
  réservations réellement concurrentes sur une organisation au bord de son
  plafond ne laissent passer qu'un seul appel — c'est le test qui échouait
  avant ce correctif, et il a été vérifié comme tel en affaiblissant la clause
  `WHERE` (deux tests passent alors au rouge). S'y ajoutent la libération, la
  remise à disposition du budget après libération, l'absence de réservation
  pour un plan illimité, la libération sur chemin d'échec, et le rattrapage
  manuel.
- **Un test existant a dû être ajusté.** `assistant_chat.spec.ts` assertait
  l'**absence** de ligne `ai_token_usages` après un échec d'appel. La
  réservation crée désormais la ligne du mois avant l'appel — c'est elle qui
  rend le plafond opposable pendant l'appel. L'assertion porte maintenant sur
  les deux compteurs à zéro, ce qui prouve en plus que la réservation a bien
  été relâchée.
