# 2026-06-15 — Fix : navigation mobile absente dans le header public (#46)

**Correctif mobile — `AppHeader.vue` / `AppHeaderMobileDrawer.vue`**

Sur mobile (< 768 px), la nav principale (`Features`, `Pricing`, `Guide`) était masquée sans alternative. Ajout d'un bouton hamburger (visible uniquement sous `md:`) qui ouvre un drawer latéral droit. Le drawer expose les mêmes liens que la nav desktop, un sélecteur de langue et les CTA Login / S'inscrire. Fermeture via overlay cliquable, touche Escape, ou navigation Inertia. La logique du drawer est extraite dans `AppHeaderMobileDrawer.vue` pour respecter la limite de 250 lignes par composant. Les boutons Login / S'inscrire sont masqués en desktop dans la barre d'actions lorsque le hamburger est présent.
