# 2026-05-15

## Médias bateaux (photos et documents)

- Upload de photos et documents via Cloudinary
- Galerie photo sur la fiche bateau (onglet Documents)
- Chemins Cloudinary préfixés par environnement (isolation prod/staging)

## Système email

Intégration `@adonisjs/mail` avec transport SMTP — utilisé pour les emails transactionnels (reset password, notifications futures).

## Enrichissement fiche moteur

- **Heures à l'installation** (`install_hours`) : compteur de référence à la pose
- **Type de cycle** (`stroke_type`) : 2 temps / 4 temps

## Statut des équipements

Champ `status` sur les moteurs, voiles et gréements : `operational` · `in_maintenance` · `out_of_service` · `retired`, affiché avec badge coloré dans l'UI.

## Événements de maintenance depuis la fiche moteur

Ajout d'un événement de maintenance directement depuis la page moteur, sans repasser par la fiche bateau.

## Transitions UI

Animations de transition sur les onglets (indicateur glissant), modals et pages.

---
