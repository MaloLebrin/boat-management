# 2026-07-09 — Marketing : ajustements design (glow-border, layout, case study, particules)

Correctifs visuels sur la home suite à la refonte :

- **`.glow-border`** : après plusieurs itérations (rotation, halo pulsant, lueur au survol jugée invisible), le liseré des cartes mises en avant adopte un **faisceau lumineux coral → violet qui tourne en continu autour du bord** (« border beam ») — animation toujours visible, sans dépendre du survol. Angle animé via `@property --beam-angle` (keyframe `beamRotate`), masqué en anneau (pas de coin qui dépasse). Le composable `use_pointer_glow` (approche mouse-follow abandonnée) est supprimé. La section des tarifs gagne du padding-haut (`pt-20 lg:pt-28`) pour détacher la carte Pro du hero sombre. Impacte socle offre modulaire, tier Pro et récap configurateur.
- **`HomeHowItWorksSection`** : sections « comment ça marche », timeline J1/J7/J30 et preview n'avaient pas de conteneur `max-w` → contenu étalé bord à bord. Ajout des conteneurs centrés (`max-w-6xl` / `max-w-4xl`) ; timeline redessinée en carte navy centrée avec ligne de liaison horizontale.
- **`HomeCaseStudySection`** : largeur contrainte (`max-w-5xl`), mise en carte (bandeau métriques avec séparateurs, colonnes défi/solution/résultats en cartes à liseré coloré, CTA en pied).
- **CTA final** : réseau de particules plus dense et plus visible (densité 0.7 → 1.3, points plus grands/clairs).
