# 2026-07-10 — Marketing : correctifs animations (ticker hero, scroll-reveal)

Deux correctifs sur la couche d'animations « Stripe-like » de la home :

- **Mockup du hero** : le panneau « À venir » (`HomeMockDashboard`) affichait une liste statique. Ajout de `HomeMockUpcomingTasks.vue` (8 bateaux, liste dupliquée pour une boucle sans couture, fondu haut/bas via `mask-image`) et de la classe `.task-scroll` (`app.css`, keyframe `taskScroll`, boucle verticale 4.5s, pause au survol, coupée sous `prefers-reduced-motion`).
- **Éléments jamais révélés au scroll** : le bloc timeline J1/J7/J30 (`HomeHowItWorksSection`) et le pull-quote (`HomeContentSections`) n'étaient jamais câblés à `useScrollReveal` — ils s'affichaient dès le chargement au lieu d'attendre le scroll, contrairement aux sections voisines. Câblage du pattern standard (`useScrollReveal()` + `:ref` + `class="reveal"` + `:class="{ visible }"`) sur les deux blocs.
- **Doc** : `inertia/css/ANIMATIONS.md` mis à jour (ticker).
