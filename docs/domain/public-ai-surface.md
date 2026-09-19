# Surface IA publique — bornes de coût

> Les deux chats IA ouverts sans compte : diagnostic de panne (#602,
> `/en/engine-diagnosis-ai` • `/fr/diagnostic-panne-ia`) et recherche de
> référence de pièce (#634 Phase 2, `/en/engine-part-finder-ai` •
> `/fr/reference-piece-moteur-ia`). Ce document couvre **ce qui borne leur
> coût** (#762) ; le fonctionnement de chaque chat est décrit dans
> `docs/domain/diagnostic.md` et `docs/domain/spare-parts.md`.

## Le problème

Les deux appellent Mistral de façon **synchrone**, avec la clé
`MISTRAL_API_KEY` de l'app, pour des visiteurs anonymes : aucun compteur
d'organisation n'est débité, le coût n'est imputé à personne.

Le seul plafond par visiteur vivait **dans la session** —
`PUBLIC_DIAGNOSIS_LIFETIME_LIMIT` (2) et son jumeau
`PUBLIC_PART_SEARCH_LIFETIME_LIMIT`, comptés sur la liste de tokens stockée en
session. Vider ses cookies le remettait à zéro : deux conversations par
session, autant de sessions qu'on veut.

Restait le throttle par IP (`publicDiagnosisThrottle`,
`publicPartSearchThrottle`), 6 requêtes par minute — soit **~8 600 appels
Mistral par jour et par IP**, sans plafond cumulé. Depuis un pool d'IP
résidentielles, plus aucune borne du tout.

## Les deux compteurs

`PublicAiBudgetService` (`app/services/public_ai_budget_service.ts`), table
`public_ai_usages`. Les deux ne s'appliquent qu'aux **visiteurs anonymes** :
un utilisateur connecté est identifié et déjà borné par son plan, et le lui
appliquer le ferait dépendre du comportement d'inconnus partageant son IP.

| Borne                  | Constante                                    | Portée                                  |
| ---------------------- | -------------------------------------------- | --------------------------------------- |
| Conversations ouvertes | `PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY` (5) | par IP, par jour, **par surface**       |
| Tokens consommés       | `PUBLIC_AI_DAILY_TOKEN_BUDGET` (3 000 000)   | global, par jour, **les deux surfaces** |

Cinq conversations plutôt que deux parce qu'une IP est partagée — un NAT
d'entreprise ou un réseau mobile place plusieurs visiteurs derrière la même
adresse — et trois ordres de grandeur en dessous de ce que laisse passer le
throttle par minute.

Le plafond par IP ne protège pas d'un pool d'IP : **c'est le budget global qui
le fait**. Au-delà, les deux chats se dégradent en invitant à créer un compte
(`flash.publicAi.dailyBudgetExhausted`) au lieu de continuer à facturer. Le
message est distinct de celui du plafond personnel : le visiteur n'y est pour
rien.

Le compteur de session **reste en place**, comme confort d'UX (l'écran sait
dire « vous avez utilisé vos essais gratuits » sans aller en base). Il n'est
plus le garde-fou.

## Ce qui ne se devine pas

- **La réservation est atomique.** `reserveConversation()` incrémente et teste
  le plafond dans une seule instruction (`INSERT … ON CONFLICT … DO UPDATE …
WHERE conversations < ?`) : un `SELECT` suivi d'un `UPDATE` laisserait deux
  requêtes simultanées franchir le plafond ensemble. C'est la contrainte
  d'unicité `(day, surface, client_key)` qui les sérialise.
- **La réservation précède l'appel au modèle.** Une conversation qui échoue
  ensuite (réponse inexploitable) aura consommé son jeton. C'est voulu : un
  échec côté modèle coûte quand même un appel Mistral, et la borne compte les
  appels, pas les succès.
- **Le budget est vérifié à chaque message, pas seulement à l'ouverture** :
  chaque tour est un appel de plus. Le plafond de conversations, lui, ne
  compte que les ouvertures — le nombre de tours est déjà borné par
  `PUBLIC_DIAGNOSIS_MAX_USER_MESSAGES` / `PART_SEARCH_MAX_USER_MESSAGES`.
- **La clé client n'est jamais l'IP en clair.** `client_key` est un HMAC-SHA256
  de l'IP salé par `APP_KEY` **et par le jour** : sans cela, la table serait un
  journal d'adresses de visiteurs pour une fonctionnalité qui n'en a pas
  besoin. Le sel journalier fait qu'une même IP produit une clé différente
  chaque jour — deux jours ne se recoupent pas.
- **Le budget global se lit sans verrou.** Deux requêtes simultanées peuvent
  toutes deux passer le dernier tour : le dépassement est alors d'un appel sur
  un budget qui en autorise des centaines. Un verrou coûterait plus cher que
  ce qu'il éviterait ; ce qui compte est que le budget s'arrête, pas qu'il
  s'arrête à la molécule près.
- **Pas de cron de purge.** Chaque ligne meurt en 24 h d'utilité.
  `assertDailyBudgetAvailable()` balaye les lignes au-delà de
  `PUBLIC_AI_USAGE_RETENTION_DAYS` (7) au **premier passage de la journée** —
  le seul moment où l'on sait qu'aucune ligne du jour n'existe encore, donc le
  moins cher.

## Mesure

Les tokens des anonymes n'apparaissaient **nulle part** : `ai_token_usages` ne
compte que les organisations. `recordTokens()` les inscrit sur deux lignes, celle
du visiteur et l'agrégée — sans mesure, on ne savait pas ce que la surface
publique coûtait réellement.

```sql
-- Ce qu'a coûté la surface publique hier
SELECT tokens_used FROM public_ai_usages
WHERE day = CURRENT_DATE - 1 AND surface = 'all' AND client_key = 'global';
```

## Où c'est testé

| Fichier                                                   | Ce qu'il couvre                                                                                                                                                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/functional/marketing/public_ai_budget.spec.ts`     | le plafond par IP survit au vidage de cookies ; les deux surfaces ne se volent pas leur plafond ; le budget global dégrade les deux chats ; les tokens sont comptés et la clé n'est pas l'IP ; le budget coupe aussi les messages suivants ; la purge |
| `tests/functional/ai/public_diagnosis.spec.ts`            | le chat de diagnostic lui-même (#602)                                                                                                                                                                                                                 |
| `tests/functional/spare_parts/public_part_search.spec.ts` | le chat de recherche de pièce (#634)                                                                                                                                                                                                                  |

## Hors périmètre

- Le quota de tokens des organisations authentifiées
  (`AiTokenQuotaService`) — il a sa propre doc, `docs/domain/ai-token-quota.md`.
- Les organisations BYOK, qui sautent délibérément le quota puisqu'elles
  paient leur propre clé.
- Un captcha sur la surface publique : choix produit (friction), pas un
  correctif de coût.
