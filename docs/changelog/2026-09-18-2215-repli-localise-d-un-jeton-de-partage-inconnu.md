# 2026-09-18 — Simulateur : un jeton de partage inconnu renvoie à la bonne locale (#732)

`SimulatorShareController.show` sert les deux routes de lecture, FR et EN, et retombait sur une redirection unique vers `/fr/simulateur-cout-entretien`. Un visiteur anglophone qui suivait un lien de partage périmé ou mal recopié atterrissait donc sur la page française du simulateur.

- **Cause.** Les deux routes (`simulator.share.show.fr`, `simulator.share.show.en`) pointent sur la même méthode ; la branche d'échec écrivait son chemin de repli en dur, là où la branche de succès distingue déjà les deux locales pour construire le chemin de partage.
- **Correctif.** La locale se déduit du nom de la route empruntée, et la cible passe par `marketingPath('simulator', locale)` (`shared/helpers/locale_path.ts`), déjà source de vérité des liens marketing : `/simulateur/r/:token` → `/fr/simulateur-cout-entretien`, `/simulator/r/:token` → `/en/maintenance-cost-simulator`.
- **Comportement.** Jeton valide : inchangé. Jeton inconnu depuis la route FR : inchangé. Jeton inconnu depuis la route EN : `302` vers `/en/maintenance-cost-simulator` au lieu de la page FR.
- **Tests.** `simulator_share.spec.ts` : les deux cas « jeton invalide » sont dédoublés par locale, avec la cible attendue de chacune. Le cas de caractérisation #732 de `simulator_share_creation.spec.ts` disparaît.
- **Docs.** `docs/domain/simulator.md` : le constat #732 devient la description du repli localisé.
