# 2026-10-26 — Spike : base de l'image Raspberry Pi Signal K (#1032)

Section C de l'issue #1032 (« Signal K plug and play »). Spike documentaire, **aucun code applicatif** et aucun dépôt créé : `docs/architecture/signalk-image-spike.md` tranche la base de l'image à flasher.

- **Décision.** Raspberry Pi OS Lite 64 bits (Trixie) + Signal K + plugin `signalk-fleetai`, assemblés par `pi-gen` en CI. OpenPlotter écarté (Imager à refuser, utilisateur `pi`, mot de passe commun) ; HaLOS écarté (Internet au premier démarrage, identifiants communs) mais gardé comme référence pour le point d'accès.
- **Constat majeur.** L'Imager 2.x ne propose **aucune** personnalisation (Wi-Fi compris) pour une image locale : l'image doit être déclarée dans un manifeste d'OS (`init_format: cloudinit-rpi`) ou inscrite à la liste officielle. Le point d'accès de repli devient le filet de sécurité principal.
- **Sécurité.** Sur un Signal K neuf, le premier visiteur du réseau peut créer l'administrateur (`POST /skServer/enableSecurity`) : l'image doit le faire au premier démarrage, avant d'écouter hors `localhost`.
- **Contenu.** Tableau comparatif étiqueté vérifié / déduit / à tester sur matériel, risques, liste de recette matérielle (Pi 4 et 5, PICAN-M, NGT-1), exigences sur l'API d'appairage (partie A), plan en 10 étapes, décisions demandées.
- **Docs.** `docs/architecture/signalk-image-spike.md`. Pas de test : document uniquement.
