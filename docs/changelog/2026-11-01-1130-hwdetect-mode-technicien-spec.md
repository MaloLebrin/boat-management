# 2026-11-01 — Détection matérielle de la boîte et mode technicien : spécification (#1039)

Épopée « Boîte FleetAi » (#1044). Le code de `fleetai-hwdetect` et de la page locale vit dans le dépôt image `signalk-fleetai-image` (#1032 partie C, non encore créé) : cette PR livre, côté FleetAi, la **spécification** que la session image implémentera, ainsi que la documentation utilisateur. Aucun code applicatif, aucune migration, aucun changement d'API.

- **Spécification.** Nouveau `docs/architecture/signalk-image-hwdetect.md` : détection PICAN-M / passerelles USB NMEA 2000 / USB-série NMEA 0183 (essai 4800 puis 38400, ≥ 2 phrases à somme de contrôle valide), règle « ne jamais toucher une connexion manuelle » (marqueur `fleetaiManaged`), contrat du fichier d'état `hardware.json` (v1), onglet Technicien (authentification, actions bornées, export de diagnostic par liste blanche), critères de test.
- **Langage des outils de l'image.** Recommandation : shell + Python 3 stdlib (déjà présent, réparable sur le terrain), Rust écarté pour la v1 ; **à confirmer par Malo** avant le démarrage du dépôt image.
- **Docs mises à jour.** Spike §7 (renvoi), protocole de test T8 étendu, guide utilisateur `instruments-signalk.md` (« Mode technicien de la boîte »).
- **Copilote.** Entrée `instruments-hwdetect` dans `product_knowledge.ts` (FR + EN).
- **Points [M].** VID:PID des passerelles, comportement de l'overlay sans carte, paramètres PICAN-M : à relever en T8, rien n'est figé.
- **Recouvrement avec #1036.** Aucun fichier commun ; le champ `hardware` du statut est transmis par le plugin dans l'inventaire, sans modifier le contrat de l'API.
