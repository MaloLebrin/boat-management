# 2026-09-19 — Ghostscript borné et bac à sable explicite (#772)

Tout PDF uploadé passe par Ghostscript avant l'envoi sur Cloudinary. C'est le
seul endroit de l'app qui exécute un binaire externe, et il le fait sur un
fichier intégralement fourni par l'utilisateur.

- **Cause.** `execFileAsync('gs', …)` était appelé sans aucune option
  d'exécution. Sans `timeout`, un PDF conçu pour faire boucler l'interpréteur
  (récursion de motifs, boucle PostScript, bombe de décompression) immobilise
  le processus indéfiniment. Le worker de queue tourne avec une concurrence de
  5 : cinq documents de ce genre suffisaient à bloquer toute la file, et avec
  elle les e-mails, les notifications et les exports — sans exploiter la
  moindre vulnérabilité de Ghostscript, juste avec un PDF coûteux.
- **Correctif.** `timeout` de 30 s, `killSignal: 'SIGKILL'` (Ghostscript ne
  sort pas toujours sur `SIGTERM`) et `maxBuffer` explicite à 8 Mo, au lieu du
  défaut d'1 Mo qui faisait échouer l'appel de façon opaque sur un PDF bavard.
  `-dSAFER` est passé explicitement plutôt que supposé, et `-f` précède le
  chemin d'entrée pour qu'un opérande commençant par `-` reste lu comme un nom
  de fichier.
- **Nettoyage.** Le `cleanup` rendu par `compress()` n'était jamais appelé
  quand l'appel levait : Ghostscript pouvait laisser un PDF partiel dans
  `tmpdir()`. Le fichier de sortie est désormais supprimé sur le chemin
  d'erreur, avant que l'exception ne remonte.
- **Observabilité.** Nouvelle `PdfCompressionTimeoutError`
  (`app/exceptions/media_errors.ts`) : le repli sur le PDF non compressé de
  `cloudinary_service.ts` est conservé, mais le timeout est journalisé à part
  (`reason: 'pdf_compression_timeout'`). Un pic de timeouts est un signal
  d'abus, il ne doit pas se noyer dans les avertissements de compression.
- **Docker.** `apk add 'ghostscript>=10.03'` au lieu de la version que sert le
  dépôt Alpine au moment du build. Un plancher plutôt qu'un numéro exact : la
  contrainte reste vérifiable sans casser le build au premier retrait du
  paquet de l'index.
- **Choix.** L'issue proposait `--` avant le chemin d'entrée. `-f` lui est
  préféré : `--` bascule Ghostscript dans son mode « arguments PostScript »,
  où tous les opérandes restants sont exposés à `ARGUMENTS` au lieu d'être
  traités normalement. `-f` est l'option documentée pour « lire ce nom de
  fichier même s'il commence par `-` ou `=` », sans effet de bord.
- **Tests.** `tests/unit/services/pdf_service.spec.ts` fige l'`argv` construit
  (`-dSAFER`, `-f` juste avant le chemin d'entrée, fichier de sortie) et les
  options d'exécution (`timeout`, `SIGKILL`, `maxBuffer` au-dessus du défaut).
  Un test de bout en bout avec un vrai PDF hostile est hors de portée d'un test
  unitaire — c'est l'assertion sur l'`argv` qui empêche la régression.
