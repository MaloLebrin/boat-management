# 2026-09-16 — Tests de caractérisation des contrôleurs sans test (refactorisation, vague 0.4)

Cinq contrôleurs de production n'avaient aucun test fonctionnel. La vague 1.4 du
plan de refactorisation va mutualiser la résolution du bateau (`loadBoat`) qu'ils
partagent avec douze autres contrôleurs : il fallait d'abord figer leur
comportement.

- **`tests/functional/boats/incidents.spec.ts`** — `BoatIncidentsController` : création (champs nettoyés, statut `open`, date locale → UTC), rôles (membre autorisé, mécanicien et propriétaire refusés, suppression réservée aux admins), bateau d'une autre organisation → `/boats`, validation, clôture/réouverture (`closedAt`), incident introuvable → flash.
- **`tests/functional/boats/boat_position.spec.ts`** — `BoatPositionController` : position manuelle historisée, clôture de la position précédente, coordonnées hors plage, isolation d'organisation, propriétaire refusé.
- **`tests/functional/boats/boat_simulator.spec.ts`** — `BoatSimulatorController` : pré-remplissage du simulateur (type, catégorie, année, présence de moteur), type inconnu non transmis, 404 hors organisation, 403 propriétaire.
- **`tests/functional/boats/crew_role_pdf.spec.ts`** — `CrewRolePdfController` : PDF nommé d'après la date de départ, sortie d'un autre bateau → onglet journal, hors organisation → `/boats`, 403 propriétaire.
- **`tests/functional/simulator/simulator_session.spec.ts`** — `SimulatorController` : session du simulateur public (payload validé, redirection vers l'inscription), création du bateau depuis le simulateur (nom, propulsion — un semi-rigide devient un bateau à moteur), utilisateur sans organisation, plafond de bateaux du plan (flash d'upsell du handler global).
- **33 tests**, aucun changement de code applicatif. Branche basée sur la vague 0.1 (factories `BoatIncident`, `CrewMember`).
