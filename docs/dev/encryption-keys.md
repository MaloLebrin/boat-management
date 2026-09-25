# Clés de chiffrement : `ENCRYPTION_KEY` et rotation (#786)

L'application manipule deux clés secrètes aux rôles distincts :

| Variable                  | Sert à                                                                                    | Rotation                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `APP_KEY`                 | Signer et chiffrer ce que gère le framework : cookies, sessions, remember-me              | Libre : elle déconnecte tout le monde, rien de plus                    |
| `ENCRYPTION_KEY`          | Chiffrer au repos les secrets stockés en base — aujourd'hui les clés API IA BYOK          | Par fenêtre : `ENCRYPTION_KEY_PREVIOUS` + `node ace encryption:rotate` |
| `ENCRYPTION_KEY_PREVIOUS` | Ancienne `ENCRYPTION_KEY`, acceptée en déchiffrement le temps de rechiffrer (optionnelle) | Retirée une fois la rotation terminée                                  |

Avant #786, les clés BYOK étaient chiffrées avec `APP_KEY`. Faire tourner
`APP_KEY` — après un départ dans l'équipe, une fuite suspectée, ou par
hygiène — rendait **toutes** les clés BYOK indéchiffrables, sans fenêtre où
l'ancienne et la nouvelle valeur cohabitent. En pratique, `APP_KEY` ne
tournait donc jamais, alors que c'est précisément la valeur pour laquelle une
rotation doit rester possible.

`config/encryption.ts` déclare deux encrypteurs AES-256-GCM :

- `gcm` (défaut), clé `APP_KEY` — le framework ;
- `data`, trousseau `[ENCRYPTION_KEY, ENCRYPTION_KEY_PREVIOUS]` — la première
  clé chiffre, toutes sont essayées au déchiffrement (`@boringnode/encryption`).

Chaque valeur chiffrée porte l'`id` de son encrypteur en préfixe (`data.…`,
`gcm.…`) et le driver refuse un préfixe étranger : une valeur `gcm.` (ère
`APP_KEY`) ne sera jamais acceptée par `data`, même avec la même clé. C'est
ce préfixe qui distingue les valeurs héritées à rechiffrer.

`app/services/data_encryption_service.ts` est le seul point d'entrée : il
chiffre toujours avec la clé courante, et déchiffre en cascade — trousseau
`data`, puis encrypteur `gcm` pour les valeurs d'avant #786. Il rend à
l'appelant le trousseau qui a réussi (`data` ou `app_key`).

**L'app refuse de démarrer si `ENCRYPTION_KEY` est égale à `APP_KEY`**
(`EncryptionKeyReusesAppKeyError`) : le découplage serait fictif.

## Générer une clé

```bash
openssl rand -base64 32
```

`node ace generate:key` ne renseigne que `APP_KEY` ; ne pas copier sa valeur
dans `ENCRYPTION_KEY`.

## Migration initiale depuis `APP_KEY` (une fois, au déploiement de #786)

1. Générer `ENCRYPTION_KEY` et la poser dans l'environnement de production
   (`.env` pour le self-host, variables de la plateforme sinon). Sans elle,
   `start/env.ts` bloque le démarrage. Laisser `ENCRYPTION_KEY_PREVIOUS` vide.
2. Déployer. Les clés BYOK existantes (`gcm.…`) restent lues par le repli sur
   `APP_KEY` : aucune interruption, mais chaque résolution journalise un
   `warn` « encore chiffrée avec APP_KEY ».
3. Rechiffrer :

   ```bash
   node ace encryption:rotate --dry-run   # compte, n'écrit rien
   node ace encryption:rotate
   ```

   En self-host : `docker compose -f docker-compose.prod.yml exec web node ace encryption:rotate`.

4. Plus aucun `warn` ne doit apparaître. `APP_KEY` peut désormais tourner sans
   toucher aux données.

## Rotation d'`ENCRYPTION_KEY`

1. Générer la nouvelle clé.
2. Déplacer la valeur actuelle dans `ENCRYPTION_KEY_PREVIOUS`, poser la
   nouvelle dans `ENCRYPTION_KEY`, redéployer. Les valeurs chiffrées avec
   l'ancienne clé restent lisibles pendant toute la fenêtre.
3. `node ace encryption:rotate --dry-run`, puis `node ace encryption:rotate`.
   La commande rechiffre **toutes** les lignes avec la clé courante (idempotente,
   relançable), affiche le rapport et sort en code 1 si une valeur n'est
   déchiffrable par aucune clé — cette ligne est laissée telle quelle et
   identifiée dans les journaux (`organizationId`, `provider`) : l'admin de
   l'organisation doit ressaisir sa clé sur `/settings/ai`.
4. Retirer `ENCRYPTION_KEY_PREVIOUS` et redéployer. Une valeur qui n'aurait
   pas été rechiffrée deviendrait illisible à cette étape — d'où le `--dry-run`
   et le code de sortie.

Une rotation n'a pas de délai : la fenêtre dure le temps qu'on veut, mais une
clé compromise reste acceptée tant que `ENCRYPTION_KEY_PREVIOUS` est posée.

## Ce qu'il faut surveiller

Une clé BYOK indéchiffrable **ne bloque pas** l'assistant : l'organisation
retombe sur la clé Mistral de l'app et sur le quota de tokens, exactement comme
si elle n'avait pas de fournisseur actif. Sans signal, un incident de
configuration se lirait sur la facture Mistral. D'où :

- l'événement `AiKeyUndecryptable` (`app/events/`), émis par
  `OrganizationAiKeyService.resolveActiveKey`, journalisé en `error` par
  `app/listeners/log_ai_key_undecryptable.ts` avec un champ stable
  `event: "ai_key_undecryptable"` — c'est cette clé qu'il faut compter et
  alerter dans l'agrégateur de logs (`organizationId`, `provider` en contexte,
  jamais la valeur chiffrée) ;
- le `warn` « clé BYOK encore chiffrée avec APP_KEY » : la migration initiale
  n'a pas été terminée, lancer `encryption:rotate`.

## Fichiers

| Fichier                                                                           | Rôle                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `config/encryption.ts`                                                            | Encrypteurs `gcm` (APP_KEY) et `data` (ENCRYPTION_KEY + PREVIOUS) |
| `app/services/data_encryption_service.ts`                                         | Chiffrer / déchiffrer en cascade, trousseau rendu à l'appelant    |
| `app/services/organization_ai_key_service.ts`                                     | `setKey`, `resolveActiveKey` (signal), `reencryptAll` (rotation)  |
| `commands/encryption_rotate.ts`                                                   | `node ace encryption:rotate [--dry-run]`                          |
| `app/events/ai_key_undecryptable.ts`, `app/listeners/log_ai_key_undecryptable.ts` | Le signal d'échec                                                 |
| `app/exceptions/encryption_errors.ts`                                             | `EncryptionKeyReusesAppKeyError` (garde au boot)                  |
| `shared/types/encryption.ts`                                                      | `DecryptedSecret`, `AiKeyRotationReport`                          |
| `tests/unit/services/data_encryption_service.spec.ts`                             | Fenêtre de rotation, repli legacy, préfixes                       |
| `tests/integration/services/organization_ai_key_rotation.spec.ts`                 | Rechiffrement, idempotence, dry-run, code de sortie               |
| `tests/functional/settings/ai_api_key.spec.ts`                                    | Stockage sous `ENCRYPTION_KEY`, résolution, événement d'échec     |
