# Devises (#627)

FleetAi fonctionne dans plusieurs devises, sans conversion de change. Le principe :
**locale ≠ devise**.

- La **locale** (fr/en) décide de la _forme_ : séparateurs, position du symbole
  (`1 200,50 $AU` en FR, `A$1,200.50` en EN).
- La **devise** est une _donnée_ attachée au montant ou à l'organisation. Elle n'est jamais
  déduite de la langue : une organisation australienne peut travailler en français.

## 1. Devises proposées

`shared/types/currency.ts` : `SUPPORTED_CURRENCIES` liste les devises proposées (liste fermée,
code ISO 4217 en majuscules) :

- `EUR`, `USD`, `GBP`, `CHF`
- `AUD`, `NZD`, `CAD`
- `SEK`, `NOK`, `DKK`, `PLN`
- `XPF` (Polynésie, Nouvelle-Calédonie)
- `JPY`

`DEFAULT_CURRENCY` vaut `EUR`.

Cette même liste alimente trois usages :

- la validation VineJS (`vine.enum`) de `PUT /settings/org`, `POST|PUT /invoices` et
  `PUT /boats/:id/pricing` — une valeur hors liste (`usd`, `BTC`) est refusée ;
- les `<select>` de devise, avec un libellé localisé par ICU (`currencyOptions(locale)`,
  `Intl.DisplayNames`) : `euro (EUR)` · `Euro (EUR)`, sans clé i18n par devise ;
- la colonne `organizations.currency`.

Ajouter une devise revient à l'ajouter à la liste ; aucune migration n'est nécessaire.

## 2. Devise de travail de l'organisation

Colonne `organizations.currency` (string(3), défaut `EUR`, migration
`1886000000000_add_currency_to_organizations`). Les organisations existantes restent en euros.

- **Réglage** : dans `/settings/org`, le formulaire de renommage porte un `<select>` « Devise de
  travail ». Le champ est facultatif dans `PUT /settings/org` : un formulaire qui ne l'envoie pas
  ne remet pas l'organisation en euros. Il est gardé par `organization.manage` ; un membre le voit
  en lecture seule.
- **Prop partagée** `organizationCurrency` (absente pour un visiteur anonyme). Elle est lue par
  `useNumberFormat()`.
- **Repli des montants sans devise propre** : `formatCurrency(value)` sans `currency` prend la
  devise de l'organisation (EUR sur une page publique). Cela couvre budget, carburant, tableau de
  bord, rapports, inventaire, portail propriétaire, etc. Un montant qui a sa propre devise (facture,
  tarif, devis de réservation) la passe explicitement, et celle-ci l'emporte toujours.
- **Défaut des nouveaux documents** :
  - une facture ou un devis créé sans devise (`InvoiceService.create`) prend celle de
    l'organisation ;
  - de même pour un tarif de bateau (`BoatPricingService.upsert`) ;
  - le devis né d'une réservation (`createQuoteFromReservation`) reprend la devise du tarif du
    bateau, sinon celle de l'organisation.
  - Côté formulaires, `invoices/form.vue` et `BoatShowTabPricing.vue` présélectionnent la devise
    de l'organisation.
- **Snapshot** : changer la devise de l'organisation ne réécrit rien. Une facture émise garde sa
  devise, et un tarif existant aussi.

## 3. Formatage

Le helper unique est `formatCurrency(value, locale, { currency, fractionDigits })`, dans
`shared/helpers/number_format.ts`.

- **Côté Inertia** : passer par `useNumberFormat()`, qui lie la locale de l'app et la devise de
  l'organisation.
- **Côté backend** (PDF, e-mails) : appeler le helper avec `i18n.locale` et la devise du document.
- **Décimales** : sans `fractionDigits`, `Intl` applique celles de la devise. On obtient
  `1 200,00 €`, mais `¥1,200` et `1 200 F CFP`.
- **Exception** : le simulateur public reste en euros. Ses barèmes sont des coûts du marché
  français, et il force `currency: 'EUR'`.

**Stripe** (`toMinorUnits(amount, currency)`) : `unit_amount` est exprimé dans la plus petite
unité de la devise. Ainsi `120.50 EUR` donne `12050`, mais `1200 JPY` donne `1200`. Multiplier
par 100 une facture en yens ou en francs CFP l'aurait encaissée cent fois. Le paiement en ligne
des factures (#876) passe par ce helper.

## 4. Hors périmètre (assumé)

- **Pas de conversion de change.** Additionner des devises différentes exigerait des taux datés
  (API externe). Contrainte : une organisation = une devise de travail, plus une devise propre
  par facture ou tarif. Les agrégats (tableau de bord facturation, reporting) somment les
  montants tels quels et les affichent dans la devise de l'organisation. Une facture émise dans
  une autre devise y est donc comptée sans conversion.
- **FEC** : il est tenu en euros (obligation française). Une pièce en devise y renseigne
  `Montantdevise` / `Idevise`, sans conversion (voir `invoicing.md`).
- **Prix de l'abonnement FleetAi** : ils restent affichés en euros (`formatPrice`), voir §5.

## 5. Étude : Stripe et les prix de l'abonnement dans d'autres devises

Question posée sur l'issue : Stripe peut-il gérer les devises à notre place, et comment
informer les utilisateurs sur les prix ?

**Abonnement FleetAi (Stripe Billing).** Deux mécanismes existent, sans toucher au code
métier.

1. **Adaptive Pricing (Checkout).** Option du tableau de bord Stripe. Checkout affiche au
   client étranger le prix converti dans sa devise locale, avec un taux garanti pendant la
   session. Le client paie dans sa devise, FleetAi est réglé en euros, et les frais de
   conversion sont à la charge du client.
   - Coût : aucun développement. Nos `Price` restent en EUR, et le webhook et les quotas ne
     changent pas.
   - Limite : le montant affiché varie avec le change d'un mois à l'autre.
2. **Prix multi-devises (`currency_options` sur un `Price`).** On fixe des montants « ronds »
   par devise (par exemple 29 €, 32 $, 49 $AU). Checkout choisit la devise d'après la
   localisation du client.
   - Coût : ajouter les `currency_options` aux prix du catalogue
     (`PricingCatalogService` lit aujourd'hui `unit_amount` en EUR). La page tarifs devrait
     alors afficher la devise du visiteur.
   - Contrainte Stripe : un client ne peut pas mélanger plusieurs devises d'abonnement. Une
     fois abonné en USD, il reste en USD.

**Recommandation.** Garder les prix catalogue en euros et activer Adaptive Pricing. Passer à
`currency_options` seulement si un marché (Australie, États-Unis) justifie des prix ronds
locaux.

**Informer les utilisateurs.** La page tarifs annonce les prix en euros, avec la mention
« facturé en euros ; le montant peut être affiché dans votre devise au paiement ». Checkout
montre ensuite le montant exact converti avant validation.

**Paiement en ligne des factures de location (Stripe Connect, #876).** Il est déjà
multi-devises : la session Checkout est créée dans la devise de la facture. Stripe convertit
vers la devise de règlement du compte connecté, sauf si le loueur a un compte bancaire dans
cette devise.
