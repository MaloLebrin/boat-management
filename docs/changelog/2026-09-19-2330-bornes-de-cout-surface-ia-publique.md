# Bornes de coût de la surface IA publique

**Date** : 19 septembre 2026
**Issue** : #762

## Contexte

Les deux chats IA ouverts sans compte — diagnostic de panne (#602) et
recherche de référence de pièce (#634) — appellent Mistral de façon
**synchrone**, avec la clé de l'app, pour des visiteurs anonymes. Aucun
compteur d'organisation n'est débité : le coût n'est imputé à personne.

Le seul plafond par visiteur vivait **dans la session**, donc remis à zéro par
un simple vidage de cookies. Deux conversations par session, autant de
sessions qu'on veut.

Restait le throttle par IP, 6 requêtes par minute — soit ~8 600 appels Mistral
par jour et par IP, sans plafond cumulé. Depuis un pool d'IP résidentielles,
plus aucune borne du tout. Déni de service financier, exploitable sans compte.

## Ce qui change

Nouvelle table `public_ai_usages` et `PublicAiBudgetService`. Les deux bornes
ne s'appliquent qu'aux **visiteurs anonymes** : un utilisateur connecté est
identifié et déjà borné par son plan, et le lui appliquer le ferait dépendre
du comportement d'inconnus partageant son IP.

| Borne                  | Constante                                    | Portée                              |
| ---------------------- | -------------------------------------------- | ----------------------------------- |
| Conversations ouvertes | `PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY` (5) | par IP, par jour, par surface       |
| Tokens consommés       | `PUBLIC_AI_DAILY_TOKEN_BUDGET` (3 000 000)   | global, par jour, les deux surfaces |

Cinq conversations plutôt que deux parce qu'une IP est partagée — NAT
d'entreprise, réseau mobile — et trois ordres de grandeur en dessous de ce que
laisse passer le throttle par minute.

Le plafond par IP ne protège pas d'un pool d'IP : **c'est le budget global qui
le fait**. Au-delà, les deux chats se dégradent en invitant à créer un compte
(`flash.publicAi.dailyBudgetExhausted`, EN et FR) au lieu de continuer à
facturer. Message distinct du plafond personnel — le visiteur n'y est pour
rien.

Le compteur de session **reste en place**, comme confort d'UX. Il n'est plus le
garde-fou.

## Ce qui ne se devine pas

- **La réservation est atomique.** `reserveConversation()` incrémente et teste
  le plafond dans une seule instruction (`INSERT … ON CONFLICT … DO UPDATE …
WHERE conversations < ?`) : un `SELECT` puis un `UPDATE` laisserait deux
  requêtes simultanées franchir le plafond ensemble. C'est la contrainte
  d'unicité `(day, surface, client_key)` qui les sérialise.
- **La réservation précède l'appel au modèle.** Une conversation qui échoue
  ensuite aura consommé son jeton : un échec côté modèle coûte quand même un
  appel Mistral, et la borne compte les appels, pas les succès.
- **Le budget est vérifié à chaque message**, pas seulement à l'ouverture :
  chaque tour est un appel de plus. Le plafond de conversations, lui, ne compte
  que les ouvertures — le nombre de tours est déjà borné.
- **La clé client n'est jamais l'IP en clair** : HMAC-SHA256 salé par `APP_KEY`
  **et par le jour**. Sinon la table serait un journal d'adresses de visiteurs
  pour une fonctionnalité qui n'en a pas besoin, et le sel journalier empêche
  de recouper deux jours.
- **Le budget global se lit sans verrou.** Deux requêtes simultanées peuvent
  toutes deux passer le dernier tour : le dépassement est alors d'un appel sur
  un budget qui en autorise des centaines. Un verrou coûterait plus cher que ce
  qu'il éviterait.
- **Pas de cron de purge.** Chaque ligne meurt en 24 h d'utilité ;
  `assertDailyBudgetAvailable()` balaye les lignes au-delà de sept jours au
  premier passage de la journée — le seul moment où l'on sait qu'aucune ligne
  du jour n'existe encore.

## Mesure

Les tokens des anonymes n'apparaissaient **nulle part** : `ai_token_usages` ne
compte que les organisations. Ils sont désormais inscrits sur deux lignes,
celle du visiteur et l'agrégée. Sans mesure, on ne savait pas ce que la surface
publique coûtait.

## Migration

`1856000000000_create_public_ai_usages_table.ts`, avec `down()`. Aucune donnée
à reprendre : les compteurs vivaient en session.

## Tests

`tests/functional/marketing/public_ai_budget.spec.ts` — six cas, chacun vérifié
porteur en retirant temporairement le garde-fou correspondant :

- le plafond par IP **survit à un vidage de cookies** (chaque requête part
  d'une session vierge, exactement ce que fait le contournement) ;
- les deux surfaces ne se volent pas leur plafond de conversations ;
- le budget global épuisé dégrade les **deux** chats, avec le bon message ;
- les tokens des anonymes sont comptés par IP **et** globalement, et la clé
  n'est pas l'IP ;
- un budget épuisé coupe aussi les messages suivants, pas seulement les
  ouvertures ;
- la purge efface les compteurs périmés et garde ceux du jour.
