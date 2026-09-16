# 2026-09-16 — Un seul helper pour l'en-tête Content-Disposition (vague 0.5)

Quatre contrôleurs (médias de bateau, de pièce moteur, de client, contrat
signé) portaient chacun leur copie de `buildContentDisposition()` — la
protection contre le _header splitting_ — et huit autres endpoints écrivaient
`attachment; filename="…"` à la main. L'audit du plan de refactorisation
craignait une faille sur ces derniers : vérification faite, tous leurs noms de
fichiers sont générés côté serveur ou déjà assainis (`csvFilename()`, numéro de
facture, identifiants, dates). Il s'agissait donc d'une duplication, pas d'une
vulnérabilité — mais un seul point d'entrée évite qu'un futur nom de fichier
issu d'une saisie utilisateur ne contourne la protection.

- **`shared/helpers/content_disposition.ts`** : `contentDisposition(filename, { inline })` neutralise les caractères de contrôle, guillemets et antislash dans `filename=` et transmet le nom complet (accents compris) dans `filename*=UTF-8''…` (RFC 6266 / 5987).
- **Douze endpoints migrés** : téléchargements de médias (bateau, moteur, pièce, client, contrat signé), PDF (facture, contrat de location, carnet d'entretien, historique, rôle d'équipage — les trois premiers gardent leur mode `?inline=1`), exports CSV (maintenance, avitaillements, journal de bord, budget), liste de réparation, export RGPD client.
- **Comportement visible** : les PDF et CSV qui n'envoyaient que `filename="…"` envoient désormais aussi `filename*=` — sans effet pour les navigateurs, qui lisent déjà ce paramètre sur les téléchargements de médias.
- **Tests.** `tests/unit/helpers/content_disposition.spec.ts` (4 tests : attachment, inline, injection CR/LF/guillemets, accents) ; les 89 tests fonctionnels des téléchargements restent verts.
