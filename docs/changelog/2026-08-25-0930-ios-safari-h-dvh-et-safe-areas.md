# 2026-08-25 — iOS Safari : bas de page accessible (h-dvh) et safe areas renseignées (#484)

Sur iPhone, `100vh` compte la hauteur sans la barre d'URL dynamique : avec `h-screen overflow-hidden` sur le shell authentifié, le bas du contenu passait sous la barre et devenait inatteignable. Et sans `viewport-fit=cover`, `env(safe-area-inset-*)` valait toujours 0 — bloquant pour la bottom nav mobile (#492).

- **`inertia/layouts/default.vue`.** `h-screen` → `h-dvh` sur le shell ; le header mobile prend `pt-[calc(env(safe-area-inset-top)+0.75rem)]` pour dégager l'encoche maintenant que le contenu passe dessous.
- **`inertia/components/layout/MobileSidebarDrawer.vue`.** `h-full` → `h-dvh`, `pl-[env(safe-area-inset-left)]` sur le panneau (encoche en paysage), safe-area top sur l'en-tête et bottom sur le pied (l'indicateur home ne recouvre plus le bouton Déconnexion).
- **`inertia/layouts/auth.vue`, `inertia/layouts/public.vue`, `inertia/pages/boats/simulator.vue`.** `min-h-screen` → `min-h-dvh` (shells scrollables).
- **`resources/views/inertia_layout.edge`.** Meta viewport : ajout de `viewport-fit=cover` — sans lui les variables de safe-area ne sont jamais renseignées sur iPhone à encoche.
- **Vérification.** Viewport mobile 375×812 : shell et drawer à 812 px (= innerHeight), paddings résolus (12 px/16 px avec `env()` à 0 sur desktop). Vérification sur iPhone réel attendue (Safari + PWA installée) ; non-régression automatisée à venir avec #500.
