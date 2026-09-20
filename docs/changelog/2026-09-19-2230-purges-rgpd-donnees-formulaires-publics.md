# Purges RGPD des données de formulaires publics

**Date** : 19 septembre 2026
**Issue** : #775

## Contexte

Deux purges existaient — journaux d'audit (03:00) et traces d'événements Stripe
(02:00). Tout le reste s'accumulait sans limite, dont les tables que n'importe
quel visiteur remplit depuis le site public et qui portent des adresses e-mail.
Les throttles de `start/limiter.ts` bornent le débit, pas le cumul.

L'app publie par ailleurs une politique de confidentialité qui promettait un
« délai raisonnable » sans rien derrière : l'écart entre le texte et le
comportement réel était le vrai problème, plus que la volumétrie.

## Ce qui change

### Deux jobs, planifiés avant les purges existantes

| Heure | Job                   | Tables                                                    |
| ----- | --------------------- | --------------------------------------------------------- |
| 00:00 | `PurgeExpiredTokens`  | `password_reset_tokens`, `organization_invitations`       |
| 00:30 | `PurgePublicFormData` | `contact_messages`, `simulator_leads`, `simulator_shares` |

Minuit et minuit trente plutôt que 01:00, pour ne pas croiser le
`ResetAiTokenUsage` mensuel. Chaque job délègue à la méthode `purgeExpired()`
du service du domaine et journalise le nombre de lignes supprimées par table —
une purge silencieuse ne se distingue pas d'une purge qui ne tourne plus.

### Durées retenues (`shared/constants/data_retention.ts`)

| Constante                        | Valeur        | Table / colonne                      |
| -------------------------------- | ------------- | ------------------------------------ |
| `CONTACT_MESSAGE_RETENTION_DAYS` | 730 (24 mois) | `contact_messages.created_at`        |
| `SIMULATOR_LEAD_RETENTION_DAYS`  | 730 (24 mois) | `simulator_leads.updated_at`         |
| `SIMULATOR_SHARE_LIFETIME_DAYS`  | 180 (6 mois)  | `simulator_shares.expires_at`        |
| `EXPIRED_TOKEN_GRACE_DAYS`       | 7             | expiration des deux tables de jetons |

Vingt-quatre mois pour le contact et les leads : la règle de prospection retient
trois ans à compter du dernier contact, on reste en deçà. Sept jours de grâce
sur les jetons : zéro suffirait — un jeton expiré n'a aucune utilité — mais ce
délai laisse le temps de regarder la ligne quand un utilisateur dit « mon lien
ne marche pas ».

### Trois points qui ne se devinent pas

- **La rétention d'un lead court depuis `updated_at`.** `SimulatorLeadService
.create()` est un `updateOrCreate` clé sur l'e-mail : un visiteur qui refait
  une simulation réécrit sa ligne. La table n'avait que `created_at`, donc le
  compteur serait parti de la toute première visite et aurait supprimé un
  prospect encore actif. La colonne est ajoutée — et le service pousse
  `updatedAt` **explicitement** : en `autoUpdate` seul, une simulation
  identique ne rendait la ligne dirty par aucun champ, la date restait figée, et
  la purge supprimait quelqu'un qui venait de se manifester. Ce qui datte ici,
  c'est le contact, pas la modification.
- **Les invitations acceptées ne sont jamais supprimées**, quelle que soit leur
  date. Elles disent qui a rejoint l'organisation, par qui et à quel titre :
  c'est la seule trace de ce rattachement en dehors des journaux d'audit, dont
  la rétention est plus courte.
- **`simulator_shares.expires_at` fait foi à la lecture**, pas seulement au
  passage du cron. `findByToken()` rend `null` pour un partage échu, et le
  contrôleur le traite comme un jeton inconnu — la redirection vers le
  simulateur de la route empruntée existait déjà. Sans cela, un lien expiré
  resterait ouvert jusqu'à 00:30.

### Partages du simulateur

Un lien de partage n'avait aucune expiration : il restait valide pour toujours,
sur une route publique non authentifiée. L'échéance est **matérialisée en base**
plutôt que recalculée à la lecture — la purge et la page de lecture s'accordent
sans se répéter, et un partage émis avant un changement de politique garde
l'échéance qu'on lui avait promise.

Le jeton passe de `randomBytes(6)` à `randomBytes(16)` (12 → 32 hexa, colonne
élargie à 64). 48 bits ne s'énuméraient pas en pratique et le contenu partagé ne
comporte aucune donnée personnelle : ce n'était pas la devinabilité le défaut,
mais l'absence d'échéance. Les anciens jetons restent lisibles — la recherche est
une égalité de chaîne — et disparaissent d'eux-mêmes avec la purge.

### Politique de confidentialité

La section « Durée de conservation » énumère désormais les quatre durées, en
puces (`privacy.s6_b1` à `s6_b4`, EN et FR), et la date de dernière mise à jour
suit. Une purge non documentée ne vaut rien côté conformité ; le commentaire du
builder rappelle que les deux se modifient ensemble.

## Migrations

- `1855000000000_add_expires_at_to_simulator_shares` — colonne indexée, jeton
  élargi à 64. Les lignes existantes sont rattrapées sur leur propre
  `created_at` : un partage vieux de plus de six mois devient expiré au
  déploiement. C'est l'intention — il l'était déjà en fait, sans que rien ne le
  dise.
- `1855000001000_add_updated_at_to_simulator_leads` — colonne indexée, backfill
  depuis `created_at` (la seule date d'activité qu'on ait sur les lignes
  existantes).
- `1855000002000_index_retention_columns` — index sur
  `password_reset_tokens.expires_at` et `organization_invitations.expires_at`.
  Sans eux, chaque purge fait un balayage complet de la table qu'elle est censée
  borner. `contact_messages.created_at` était déjà indexé.

Les trois `down()` sont implémentés et ont été rejoués.

## Hors périmètre

`simulator_sessions` figurait dans l'issue : **cette table n'existe pas**.
`POST /simulator/session` (`SimulatorController.saveSession`) écrit dans la
session HTTP, pas en base — il n'y a donc rien à purger.

## Tests

`tests/integration/jobs/purge_expired_tokens.spec.ts` et
`purge_public_form_data.spec.ts`, sur le modèle des purges existantes : une
ligne au-delà de la rétention est supprimée, une ligne en deçà est conservée, le
compte remonte, et repasser ne supprime rien de plus.

Les trois points ci-dessus sont couverts par un test dédié, chacun vérifié
porteur en retirant temporairement le garde-fou correspondant.
