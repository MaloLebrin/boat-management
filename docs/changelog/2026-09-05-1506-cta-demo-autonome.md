# CTA démo : fin de la « réservation », place à la démo autonome

**Date** : 2026-09-05

## Contexte

Le site marketing promettait à plusieurs endroits de « réserver une démo »
(créneau de 20-30 min en visio avec l'équipe). Ce parcours n'existe pas : on ne
book pas de démo. Les deux vraies portes d'entrée sont la **démo autonome**
(session en libre accès sur une flotte d'exemple, `POST /demo`, sans
inscription) et le **formulaire de contact**.

## Changements

### Copie (FR + EN, `resources/lang/{fr,en}/marketing.json`)

- `home.hero.cta_secondary` et `home.final_cta.secondary_cta` : « Réserver une
  démo » → « Essayer la démo » / "Try the demo".
- `pricing2.final_cta_secondary` et `about2.final_cta_secondary` : « Voir
  une/la démo » → « Essayer la démo » (ces boutons pointaient sur une ancre
  `#demo` morte depuis le retrait de `HomeDemoSection`).
- `contact2.ch1_*` : la carte « Démo personnalisée / 20 min en visio /
  Réserver un créneau » devient « Démo en accès libre / … / Lancer la démo ».
- `contact2.faq_q2`/`faq_a2` : la promesse d'un créneau de 20 min sur la
  flotte du visiteur est remplacée par démo libre accès + formulaire.
- `help.channel3_*` : « Réserve une démo / Réserver un créneau » devient
  « Essaie la démo / Lancer la démo ».
- `home.demo.*` (section non montée, conservée) : la carte « démo guidée »
  devient une carte contact (« Nous écrire »), titre « Deux minutes pour voir
  la différence ».

### Comportement

- `HomeHeroSection` et `HomeFinalCtaSection` acceptent une prop optionnelle
  `demoLoginPath` : le CTA secondaire devient un bouton qui lance la session
  de démo autonome en POST Inertia (CSRF automatique, état `processing`
  désactivant le bouton). Le repli lien (`secondaryHref`, puis ancre `#demo`
  historique) est conservé.
- Home (`inertia/pages/marketing/home.vue`) : hero et CTA final passent
  `t.home.demo.demoLoginPath` au lieu du lien vers `/contact#contact-form` ;
  le computed `demoCtaHref` est supprimé.
- Tarifs et À-propos : `buildPricingPageData`/`buildAboutPageData` exposent
  `finalCta.demoLoginPath` (constante `DEMO_LOGIN_PATH = '/demo'` dans
  `marketing_controller.ts`), transmis via `v-bind`.
- Contact : la première carte canal passe en `kind: 'demo'`
  (`ContactChannelsSection` rend alors un `<button>` qui POST sur `/demo`).
- Aide : la carte `channel3` porte `demo: true`
  (`HelpChannelsSection` rend un bouton POST ; type `HelpChannelCard` étendu
  dans `shared/types/marketing.ts`).

### Routes / champs

- Aucune nouvelle route : réutilisation de `POST /demo` (`demo.login`,
  throttlé) existant.
- Types : `HelpChannelCard.demo?: boolean` et
  `AboutPageProps…finalCta.demoLoginPath: string` dans
  `shared/types/marketing.ts` ; `kind` des cartes contact étendu à `'demo'`.

## Tests

- `tests/functional/marketing/demo_cta.spec.ts` (nouveau) : pour FR et EN,
  aucune page marketing (home, tarifs, à-propos, contact, aide) ne contient de
  formulation « Réserver une démo / un créneau » ; les props exposent bien
  `/demo` (home, finalCta tarifs/à-propos, carte contact `kind: 'demo'`,
  carte aide `demo: true`).
- `tests/inertia/marketing_demo_cta.spec.ts` (nouveau) : les CTA secondaires
  de `HomeHeroSection`/`HomeFinalCtaSection` et la carte démo de
  `HelpChannelsSection` déclenchent `form.post('/demo')` ; repli lien vérifié.
- `tests/inertia/contact_form_section.spec.ts` : la carte démo de
  `ContactChannelsSection` est un `<button>` qui POST sur `/demo`.
