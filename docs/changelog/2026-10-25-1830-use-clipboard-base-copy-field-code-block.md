# 2026-10-25 — Presse-papiers partagé : `useClipboard`, `BaseCopyField`, `BaseCodeBlock` (#1018)

La logique « copier dans le presse-papiers » (`navigator.clipboard.writeText` + état `copied` + `try/catch` silencieux) était écrite trois fois, et la carte « Plugin Signal K » affichait un jeton à usage unique sans bouton Copier. Brique préparatoire de l'assistant d'installation Signal K (#986 → #1022, #1023).

- **Composable.** `inertia/composables/use_clipboard.ts` : `useClipboard({ resetAfterMs = 2000 })` → `{ copied, supported, copy(text): Promise<boolean> }`. Aucun accès à `navigator` au SSR (`supported` est optimiste au rendu puis confirmé au montage, sans décalage d'hydratation) ; un refus ou l'absence de `navigator.clipboard` renvoie `false` sans lever ; le timer est nettoyé à la destruction du composant.
- **`BaseCopyField`.** `BaseInput` en lecture seule + bouton Copier / Copié ; props `modelValue`, `label`, `name`, `id`, `hint`, `ariaLabel`, `secret` (champ `password` sans remplissage automatique). Sans support du presse-papiers, le bouton est désactivé et un message invite à sélectionner le texte.
- **`BaseCodeBlock`.** `<pre><code>` mono sur `bg-surface-muted`, bouton Copier, props `code`, `language`, `label`, `wrap` (retour à la ligne, sinon défilement horizontal), slot `caption`.
- **Migrations.** `CalendarFeedPanel`, `BoatPublicBookingCard` et `InvoiceOnlinePaymentCard` utilisent `BaseCopyField` ; `InstrumentPluginTokenCard` l'utilise pour l'adresse d'ingestion et le jeton frais (désormais copiable).
- **i18n.** Nouvelles clés `common.clipboard.copy` / `copied` / `unavailable` (EN + FR) ; les clés `copy` / `copied` devenues inutiles de `reservations.json` et `invoices.json` sont supprimées.
- **Banc d'essai.** Les deux composants sont ajoutés à `/design-system` (onglet Components).
- **Tests.** Vitest : `use_clipboard` (succès, refus, remise à zéro avec timers simulés, `navigator.clipboard` absent, nettoyage au démontage), `base_copy_field`, `base_code_block`, et les specs des quatre composants migrés.
