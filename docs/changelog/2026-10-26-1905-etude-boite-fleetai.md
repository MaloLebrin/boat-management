# 2026-10-26 19:05 — Étude produit « Boîte FleetAi » (épopée #1044)

## Contexte

Suite de #1032 (image Raspberry Pi + appairage par code). Malo veut un produit sans limite de principe : le client achète l'application **et** une boîte, la branche sur son voilier, et FleetAi découvre lui-même les équipements ; quand ce n'est pas possible, FleetAi dit quoi ajouter et propose la pose.

## Ce qui change

- Nouveau document `docs/architecture/fleetai-box-product.md` : ce que la découverte automatique peut faire selon le bus (NMEA 2000, NMEA 0183, SeaTalk 1, aucun bus), décisions prises (Pi 4 + PICAN-M alimentée par le bus, kit assemblé vendu ≈ 350 € TTC, toujours allumée, pas de 4G, capteurs NMEA 2000 du marché, rapport de diagnostic, mode technicien, pose proposée par FleetAi), architecture cible (image, plugin, FleetAi), découpage en issues, concurrence, conformité, risques, points à valider sur matériel (T11, T12), sources.
- Épopée GitHub #1044 et issues #1036 à #1043 créées ; sections « Suite » ajoutées à #986 et #1032.

Document seul : aucun code, aucune route, aucun test automatisé.
