# 2026-09-19 — Les envois groupés sont bornés avant d'écrire sur disque (#764)

Les douze routes d'upload par lot sortent du traitement automatique du
bodyparser pour bénéficier d'une limite relevée. Le middleware qui les reprend
écrivait chaque partie du corps multipart **en entier** sur le disque avant
que le moindre validateur ne s'exécute.

- **Cause.** `onFile('*')` accepte n'importe quelle partie,
  `deferValidations: true` reporte explicitement les contrôles, et le plafond
  valait 400 Mo pour les douze routes — soit **le double** de ce qu'un lot de
  photos peut légitimement atteindre (20 × 10 Mo), donc le double de ce que le
  validateur laissera jamais passer. Un attaquant authentifié n'avait même pas
  besoin d'envoyer des fichiers valides : 400 Mo de zéros sous un nom de champ
  quelconque étaient écrits, puis rejetés. En conteneur, où `/tmp` partage
  souvent le volume applicatif, quelques requêtes concurrentes suffisaient à
  remplir le disque et à faire tomber l'app entière — pas seulement l'upload.
- **Correctif 1 — un plafond par route.** `largeUploadLimitFor(pattern)`
  dérive la limite de la nature du lot : 200 Mo pour des photos, 400 Mo pour
  des documents. La nature vient du motif de route (`/photos` / `/documents`).
- **Correctif 2 — refus avant écriture.** L'extension est lue sur
  `part.filename` avant d'ouvrir le `createWriteStream`, et le nombre de
  parties est borné ici aussi, sans attendre le `maxLength(20)` en aval. Une
  partie refusée est **drainée** — il faut consommer le flux pour que
  l'analyse continue, mais aucun octet ne touche le disque. Le validateur rend
  ensuite l'erreur habituelle : le refus précoce ne change pas ce que voit
  l'utilisateur, seulement ce que ça coûte.
- **Correctif 3 — les temporaires sont nettoyés.** Le `unlink` existant ne
  couvrait que l'échec du `pipeline` : un lot rejeté par le validateur laissait
  tout dans `tmpdir()`, et on dépendait du ménage de l'OS. Un `finally`
  supprime désormais les chemins écrits par la requête. C'est sûr parce que les
  envois vers Cloudinary ont lieu dans la requête, pas dans un job différé.
- **Correctif 4 — `file.size === 0`.** `MediaService.upload` **sautait** sa
  garde de quota quand la taille était inconnue à l'analyse : un fichier de
  taille inconnue partait chez Cloudinary sans contrôle préalable. Il mesure
  maintenant le fichier temporaire (`stat`) plutôt que de renoncer.
- **Source unique.** Extensions, tailles et nombre maximal vivent dans
  `shared/constants/media.ts`, que lisent **à la fois** le validateur et le
  middleware : ils ne peuvent plus diverger sans casser la compilation.
- **Tests.** `tests/functional/boats/large_upload_guards.spec.ts` mesure les
  deux choses qui comptent — le refus reste celui du validateur (l'utilisateur
  voit la même chose) et **rien n'est écrit dans `tmpdir()`**, y compris pour
  un lot accepté puis consommé. Vérifié comme porteur : en neutralisant le
  refus précoce et le nettoyage, trois des cinq tests passent au rouge.
  `tests/unit/hygiene/large_upload_routes.spec.ts` fige le couplage motif de
  route → plafond, pour qu'une treizième route n'arrive pas sans garde.
