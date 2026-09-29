# Test flaky des gardes d'upload : `/tmp` partagé en CI (#919)

**Date :** 2026-09-28

## Contexte

`tests/functional/boats/large_upload_guards.spec.ts` vérifie qu'une requête
d'upload ne laisse aucun fichier dans `os.tmpdir()` en comparant deux
instantanés du dossier. En CI GitHub Actions, le runtime conteneur y crée
parfois un `runc-process<id>` pendant le test, qui échouait alors sans rapport
avec le code testé (job `test-backend (functional-1)` de la PR #918).

## Changement

`tmpFilesAddedSince` ne compte plus que les noms que l'app écrit dans
`tmpdir()` :

- `<uuid>` — partie acceptée par `LargeMultipartUploadMiddleware` ;
- `<uuid>.pdf` — sortie Ghostscript de `PdfService`.

Le test échoue toujours si l'upload laisse son propre fichier temporaire
(vérifié en neutralisant le ménage de fin du middleware). Aucun changement de
code applicatif.
