# Cartographie de port réservée au plan Entreprise

**Date** : 2026-09-15

La gestion des ports (ports, pontons, mouillages, places) passe dans l'abonnement supérieur : elle est désormais **réservée au plan Entreprise**. Les plans Starter et Pro n'y ont plus accès ; la garde de profil « particulier » (quel que soit le plan) est inchangée.

- **Règle** : `PLAN_LIMITS.pro.canManagePorts` passe à `false` (`shared/types/plan.ts`). Aucun module ni add-on ne l'accorde.
- **Effets sur un compte Pro** (tous hérités de la garde existante #604) :
  - routes `/ports/*` et `/spots/:id` → redirection vers `/settings/billing` avec le flash `flash.quota.portsExceeded`, reformulé en upsell Entreprise (EN + FR) ;
  - entrée « Ports » absente du menu latéral, carte ports absente du dashboard ;
  - sélecteur de place du formulaire bateau escamoté, suggestions de ports (port d'attache, journal de bord, escales budget) vides — ces champs restent en texte libre ;
  - outil assistant `list_ports` et fiches d'aide `ports-management` / `marina-map` masqués (`planFlag`).
- **Données existantes** : les ports déjà saisis par une organisation Pro restent en base ; ils réapparaissent au passage en Entreprise.
- **Page tarifs** : nouvelle ligne « Cartographie marina » dans le tableau comparatif (`table_g2_r8`, via `flagRow('canManagePorts')`) et dans les avantages du plan Entreprise (`tier_enterprise_feat2`).
- **Assistant** : `product_knowledge.ts` mis à jour (description des plans, pages Ports et plan marina).
- **Seeders** :
  - `sandbox_seeder.ts` : l'organisation démo passe en plan `enterprise` (et une démo existante en `pro` est remontée) pour garder le plan marina visible (#478) ;
  - `malo_seeder.ts` : ne crée plus de port / mouillage / place pour le compte `ADMIN_EMAIL` (plan `pro` inchangé).
