# 2026-05-18

## Fiche bateau — champs réglementaires français

- **Port d'attache** (`home_port`) : champ texte libre sur le bateau
- **Catégorie de navigation CE** (`navigation_category`) : A / B / C / D avec descriptions (A = océanique, B = hauturière, C = côtière, D = eaux abritées)
- **Numéro de coque HIN/WIN** (`hull_identification_number`) : identifiant constructeur
- **Numéro de francisation** (`francisation_number`) : référence de l'acte douanier
- **Pavillon** (`flag_country`) : code pays (ex. `FR`)
- **Personnes max à bord** (`max_persons`) : nombre entier

## Armement de sécurité

Nouvelle section dédiée sur la fiche bateau, avec CRUD complet :

- **Types** : gilet de sauvetage, radeau, extincteur, VHF, fusée/signal de détresse, EPIRB/PLB, trousse de premiers secours, harnais, bouée, ancre, pompe de cale, compas, AIS, GPS, radar, autre
- **Quantité** : nombre d'unités
- **Date d'expiration** : suivi du renouvellement obligatoire (gilets, fusées, radeaux…)
- **Statut** : OK (vert) · À vérifier (orange) · Périmé (rouge)
- **Notes** : remarques libres par équipement
- Filtrage dans l'onglet Équipement (`?tab=safety`)
- Routes : `POST/PUT/DELETE /boats/:boatId/safety-equipment[/:itemId]`

---
