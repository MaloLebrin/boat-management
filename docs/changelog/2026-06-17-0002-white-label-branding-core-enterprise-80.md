# 2026-06-17 — White-label branding core — Enterprise #80

**Backend**

- `database/migrations/1794000000000_add_branding_to_organizations.ts` — ajout des colonnes `logo_url`, `logo_public_id`, `primary_color`, `secondary_color`, `app_name` (nullable) sur la table `organizations`.
- `shared/types/branding.ts` — interfaces `BrandingConfig` et `BrandingUpdatePayload`.
- `shared/types/plan.ts` — ajout de `canWhiteLabel: boolean` dans `PlanQuotas` (false pour Starter & Pro, true pour Enterprise).
- `app/services/cloudinary_service.ts` — ajout du dossier `orgLogo` dans `CloudinaryFolders`.
- `app/services/branding_service.ts` — `uploadLogo` (remplace l'ancien logo sur Cloudinary), `deleteLogo`, `updateBranding` (couleurs + app_name), `toBrandingConfig`.
- `app/validators/branding.ts` — `updateBrandingValidator` (couleurs hex + app_name) et `uploadLogoValidator` (2 Mo, JPG/PNG/SVG/WebP).
- `app/policies/organization_policy.ts` — méthode `configureBranding` (accordée aux admins via `before()`).
- `app/controllers/settings_controller.ts` — méthodes `branding`, `updateBranding`, `uploadLogo`, `deleteLogo`.
- `start/routes/settings.ts` — routes `GET/PUT /settings/branding` + `POST/DELETE /settings/branding/logo`.
- `app/middleware/inertia_middleware.ts` — injection du `BrandingConfig` de l'organisation dans les props Inertia partagées (null si plan non-Enterprise).

**Frontend**

- `inertia/pages/settings/branding.vue` — page de configuration branding.
- `inertia/components/settings/tabs/SettingsBrandingTab.vue` — upload de logo (preview instantané), champs couleurs avec color picker natif, champ app_name, aperçu des couleurs en bande.
- `inertia/components/settings/SettingsShell.vue` — section "Marque blanche" ajoutée dans la nav pour les orgs Enterprise.
- `resources/lang/{fr,en}/settings.json` — clés `settings.sections.branding` et `settings.branding.*`.
- `resources/lang/{fr,en}/flash.json` — clés `settings.brandingUpdated`, `settings.logoUpdated`, `settings.logoDeleted`.
