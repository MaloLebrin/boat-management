# 2026-09-25 — Clé de chiffrement dédiée et rotation pour les clés BYOK (#786)

Les clés API IA des organisations (BYOK, table `organization_ai_keys`) étaient
chiffrées avec l'encrypteur par défaut, dérivé d'`APP_KEY` — la clé qui signe
aussi cookies et sessions. Faire tourner `APP_KEY` rendait toutes les clés BYOK
indéchiffrables, sans fenêtre de transition ; en pratique elle ne tournait
jamais. Et l'échec était silencieux : `resolveActiveKey` renvoyait `null`, le
copilote retombait sur la clé Mistral de l'app et sur le quota, sans rien
signaler — un incident de configuration se serait lu sur la facture.

- **Cause.** Une seule clé pour deux besoins contradictoires : celle qu'on
  voudrait changer souvent (framework) et celle dont dépendent des données à
  déchiffrer longtemps (secrets au repos). L'issue supposait qu'il faudrait
  écrire un trousseau ; en AdonisJS v7, `@boringnode/encryption` en a déjà un
  (`keys: [courante, précédente]` — la première chiffre, toutes déchiffrent) et
  embarque l'`id` de l'encrypteur dans chaque chiffré. On s'appuie dessus plutôt
  que d'ajouter une colonne de version.
- **Correctif.** Deux nouvelles variables, `ENCRYPTION_KEY` (requise,
  `Env.schema.secret`) et `ENCRYPTION_KEY_PREVIOUS` (optionnelle, le temps
  d'une rotation). `config/encryption.ts` garde `gcm` (`APP_KEY`) par défaut
  pour le framework et ajoute l'encrypteur `data` sur ce trousseau ; l'app
  refuse de démarrer si les deux clés sont égales
  (`EncryptionKeyReusesAppKeyError`, `app/exceptions/encryption_errors.ts`).
  Nouveau `DataEncryptionService` : chiffre avec la clé courante, déchiffre en
  cascade (`data`, puis repli `gcm` pour les valeurs d'avant), et rend le
  trousseau qui a réussi. `OrganizationAiKeyService` passe par lui — le modèle
  et les tests n'appellent plus `encryption.encrypt` directement.
- **Commande.** `node ace encryption:rotate [--dry-run]` rechiffre toutes les
  clés BYOK avec la clé courante (idempotente), affiche le rapport (parcourues /
  rechiffrées / encore sous `APP_KEY` / indéchiffrables) et sort en code 1 si
  une ligne n'est lisible par aucune clé — elle est laissée telle quelle et
  identifiée dans les journaux. Même commande pour la migration initiale depuis
  `APP_KEY` et pour chaque rotation.
- **Échec visible.** Une clé indéchiffrable ramène toujours au défaut de l'app
  (comportement inchangé), mais émet `AiKeyUndecryptable` (`app/events/`),
  journalisé en `error` par `log_ai_key_undecryptable` avec un champ stable
  `event: "ai_key_undecryptable"` à compter dans l'agrégateur — ids seulement,
  jamais la valeur chiffrée. Une clé encore chiffrée avec `APP_KEY` est lue
  mais journalisée en `warn` : la migration n'est pas terminée.
- **Déploiement.** Poser `ENCRYPTION_KEY` **avant** de déployer (l'env est
  validé au boot), puis lancer `node ace encryption:rotate`. `.env.example`,
  `.env.test` et les deux blocs `env:` de la CI portent la variable.
- **Docs.** Nouveau `docs/dev/encryption-keys.md` (rôles des clés, migration
  initiale, procédure de rotation pas à pas, quoi surveiller), indexé dans
  `docs/README.md` ; `docs/dev/hosting.md`, `docs/dev/setup.md` et
  `docs/domain/ai-customization.md` mis à jour.
- **Tests.** `tests/unit/services/data_encryption_service.spec.ts` (fenêtre de
  rotation avec des encrypteurs construits en dur : lisible avec
  `[nouvelle, ancienne]`, plus avec `[nouvelle]` seule ; repli `APP_KEY` signalé
  `app_key` ; un préfixe étranger n'est jamais accepté même à clé égale),
  `tests/integration/services/organization_ai_key_rotation.spec.ts`
  (rechiffrement, idempotence, dry-run sans écriture, code de sortie de la
  commande via `ace.exec`), et `tests/functional/settings/ai_api_key.spec.ts`
  (clé stockée sous `ENCRYPTION_KEY` et illisible par `APP_KEY`, résolution
  d'une clé legacy, événement émis sur une clé indéchiffrable).
