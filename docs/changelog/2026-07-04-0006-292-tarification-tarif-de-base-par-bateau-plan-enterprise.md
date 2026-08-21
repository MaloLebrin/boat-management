# 2026-07-04 — [#292] Tarification : tarif de base par bateau (plan Enterprise)

**Socle de la tarification (epic Tarification #284, lot 1/3)** : nouvelle ressource `boat_pricing` en 1:1 par bateau, org-scopée, réservée au plan Enterprise. Expose un onglet « Tarif » sur la fiche bateau.

- **Base de données** : table `boat_pricing` (`organization_id`, `boat_id` UNIQUE, `base_daily_price`, `base_weekly_price`, `deposit_amount`, `min_days`, `max_days`, `currency` défaut `EUR`, timestamps) + index sur `organization_id`
- **Backend** : `app/models/boat_pricing.ts`, `app/services/boat_pricing_service.ts` (upsert preserve-if-absent, validation `minDays`/`maxDays`), `app/validators/boat_pricing.ts`, `app/exceptions/boat_pricing_errors.ts` (`InvalidPricingRangeError`), `app/transformers/boat_pricing_transformer.ts`, `app/controllers/boat_pricing_controller.ts` (action `update` = upsert), route `PUT /boats/:id/pricing`
- **Gating Enterprise** : flag `canManagePricing` dans `shared/types/plan.ts` (Enterprise uniquement), `quotaService.canManagePricing()` + `assertCanManagePricing()`, `QuotaFeature 'pricing'` ; accès refusé (flash + redirect) hors Enterprise
- **Intégration fiche bateau** : `BoatManageContext` étendu avec `pricing`, `pricingEnabled`, `canManagePricing` ; `BoatsController.show` charge le tarif et passe les flags au frontend
- **Frontend** : onglet « Tarif » sur la fiche bateau (`BoatShowTabPricing.vue`) — affichage du tarif courant et formulaire d'édition (`useForm` Inertia) réservé aux administrateurs Enterprise, lecture seule sinon
- **i18n** : clés `boats.show.tabs.pricing` + namespace `boats.pricing.*`, `flash.pricing.saved`, `flash.pricing.invalidRange`, `flash.quota.pricingExceeded` (en + fr)
- **Tests** : 10 fonctionnels (upsert, préservation partielle, validation de bornes, gating Enterprise/starter, IDOR, exposition des props de la fiche) + 3 Vitest (soumission du formulaire, mode lecture seule)
