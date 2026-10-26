# 2026-10-26 — Protocole de test sur Raspberry Pi réel (#1032)

Complément du spike de l'image Signal K : `docs/architecture/signalk-image-test-protocol.md` décrit dix tests à dérouler sur matériel (Pi 4 et Pi 5) pour remplacer les hypothèses du spike par des mesures : réglages de l'Imager, commande au premier démarrage (`cloud-init`), fichier de réglages sur la carte, point d'accès de repli, Ethernet, installation par paquet, bus CAN, appairage de bout en bout (API #1034), versions de l'Imager. Il contient une feuille de résultats et la liste des décisions que les résultats tranchent.

Document uniquement, aucun code, aucun test automatisé.
