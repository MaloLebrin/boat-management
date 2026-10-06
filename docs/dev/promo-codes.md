# Codes promo — créer et gérer (#955)

Guide d'exploitation : comment créer, tester, suivre et retirer un code promo FleetAi. Le détail technique (services, colonnes, webhooks) est dans [`docs/dev/stripe.md`](./stripe.md) § « Codes promo » et [`docs/billing-and-quotas.md`](../billing-and-quotas.md).

## 1. Principe

- **Tout se passe dans le Dashboard Stripe.** L'app n'a ni table de codes ni écran d'administration : il n'existe pas de backoffice plateforme.
- Le client saisit son code dans le champ **« Code promo »** de l'onglet **Paramètres → Facturation** ou de la modale d'upgrade (admin d'organisation, abonnement pas encore souscrit). L'app interroge Stripe, refuse le code sous le champ s'il est invalide, sinon ouvre Stripe Checkout avec la remise **déjà appliquée**.
- Une fois l'abonnement souscrit, la remise apparaît sur la page Facturation (ligne « Remise »), alimentée par le webhook. Aucun événement webhook supplémentaire n'est à abonner.
- **Un seul code par checkout.** Le champ n'est plus proposé une fois abonné : un code ne s'applique qu'à la souscription.
- **Test et Live sont deux catalogues séparés.** Un code créé en mode Test n'existe pas en production (et inversement) : la clé `STRIPE_SECRET_KEY` de l'environnement décide du catalogue interrogé.

## 2. Coupon et code promo : deux objets

| Objet          | Rôle                                                     | Exemple                                  |
| -------------- | -------------------------------------------------------- | ---------------------------------------- |
| **Coupon**     | _Ce que vaut_ la remise : montant, durée, produits visés | −50 % pour toujours                      |
| **Code promo** | _Ce que tape_ le client, rattaché à **un** coupon        | `ASSO50` → coupon « −50 % associations » |

Un coupon peut porter plusieurs codes : un code par partenaire (`ECOLE-NAUTIQUE`, `ASSO50`…) sur le même coupon permet de suivre l'usage de chacun séparément.

Réglages d'un **coupon** :

- **Valeur** : pourcentage, ou montant fixe (devise des prix, EUR).
- **Durée** : `Once` (première facture), `Repeating` (N mois) ou `Forever` (toute la vie de l'abonnement).
- **Produits visés** (_Apply to specific products_) : voir § 4.
- Plafond d'utilisations et date limite du coupon (facultatifs).

Réglages d'un **code promo** :

- Le **code** lui-même. Stripe le compare **sans tenir compte de la casse** : `asso50` et `ASSO50` désignent le même code.
- **Date d'expiration** et **nombre maximal d'utilisations** (facultatifs).
- Restrictions facultatives : **première transaction uniquement**, **montant minimum**, **client donné**.

## 3. Créer un code

### Dans le Dashboard

1. Basculer sur le bon mode (**Test** ou **Live**).
2. **Product catalog → Coupons → + New** : renseigner la valeur, la durée, un nom lisible (il est affiché sur la page Facturation) et, sous _Apply to specific products_, les produits visés (§ 4).
3. Ouvrir le coupon, section **Promotion codes → + New** : saisir le code, puis les limites voulues (expiration, utilisations maximales, restrictions).
4. Tester (§ 5) avant de communiquer le code.

### Avec le Stripe CLI

Équivalent pour un −50 % à vie, limité à 100 utilisations. Le CLI suit la version d'API du compte : en cas d'erreur sur `promotion`, se reporter à la référence `stripe promotion_codes create` de la version utilisée.

```bash
# 1. Le coupon (affiche son id, ici choisi à la main)
stripe coupons create --id=ASSO50 --percent-off=50 --duration=forever \
  --name="Associations et écoles −50 %"

# 2. Le code promo que le client tape
stripe promotion_codes create --code=ASSO50 --max-redemptions=100 \
  -d "promotion[type]=coupon" -d "promotion[coupon]=ASSO50"
```

Ajouter `--live` (ou la clé Live) pour créer dans le catalogue de production.

## 4. Produits visés : plans, modules, bateaux supplémentaires

Un abonnement FleetAi est un **seul abonnement Stripe** composé d'items : le plan (Pro / Entreprise), plus d'éventuels modules et « bateaux supplémentaires » (ajoutés au checkout ou plus tard). La remise est portée par l'abonnement :

- **Coupon limité aux produits des plans** : seuls les items de plan sont remisés ; les add-ons restent au tarif plein. C'est le réglage recommandé pour une offre « −X % sur l'abonnement ».
- **Coupon sans restriction de produit** : tous les items sont remisés, y compris les add-ons ajoutés après coup tant que la remise court.
- **Coupon à montant fixe** : valable dans la devise du prix seulement ; avec une facturation annuelle, un `Repeating` de N mois ne couvre que les factures dont l'échéance tombe dans ces N mois (souvent la seule première facture annuelle).

Ces règles sont celles de Stripe, pas de l'app : à vérifier en mode Test sur un abonnement réel avant une offre commerciale.

## 5. Tester avant de publier

En mode Test, avec `stripe listen --forward-to localhost:5555/webhooks/stripe` actif (voir `stripe.md` § 3) :

1. Créer le coupon et le code en mode Test.
2. Sur `/settings/billing` (organisation sans abonnement, compte admin), saisir le code puis lancer l'abonnement.
3. Vérifier sur la page Stripe Checkout que la **remise est déjà appliquée** et que le total est correct, puis payer avec `4242 4242 4242 4242`.
4. Au retour, après le webhook, la ligne **Remise** apparaît sur la page Facturation (valeur, durée, code).
5. Cas d'erreur à essayer : un code inexistant, un code désactivé, un code expiré, un code dont `max_redemptions` est atteint, un code « première transaction » sur un client qui a déjà payé. Chacun doit s'afficher **sous le champ**, sans quitter la page ni ouvrir Checkout.

## 6. Gérer un code existant

| Besoin                         | Action dans le Dashboard                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suivre l'usage                 | Fiche du code promo : nombre d'utilisations (`times_redeemed`) et clients. Un code par partenaire rend le suivi lisible.                                         |
| Arrêter une campagne           | **Désactiver** le code promo. Côté app il devient « inconnu » ; les abonnements déjà souscrits **gardent** leur remise.                                          |
| Prolonger / changer une limite | Stripe ne permet pas de modifier un code (seuls l'état actif et les métadonnées changent) ni la valeur d'un coupon : désactiver puis **recréer** un code/coupon. |
| Supprimer un coupon            | N'affecte pas les remises déjà appliquées ; les codes rattachés cessent de fonctionner pour de nouveaux clients.                                                 |
| Retirer la remise d'un abonné  | Fiche de l'abonnement ou du client → retirer la remise. Le webhook vide la ligne « Remise » de la page Facturation.                                              |
| Offrir une remise sans code    | Appliquer un coupon directement sur le client ou l'abonnement : il est synchronisé comme les autres, simplement **sans** code affiché.                           |

## 7. Dépannage

Messages montrés au client sous le champ (`validator.billing.promoCode.*`) :

| Message affiché                                       | Raison          | Cause fréquente / action                                                                                                                                                                                           |
| ----------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| « Ce code promo est inconnu ou n'est plus actif. »    | `notFound`      | Faute de frappe ; code désactivé ; **mauvais mode** (code créé en Test, clé Live) ; coupon déjà arrivé à terme.                                                                                                    |
| « Ce code promo a expiré. »                           | `expired`       | `expires_at` du code dépassé : recréer un code avec une nouvelle date.                                                                                                                                             |
| « Ce code promo a atteint sa limite d'utilisations. » | `exhausted`     | `max_redemptions` atteint : recréer un code avec un plafond plus haut.                                                                                                                                             |
| « Ce code promo ne s'applique pas à cet abonnement. » | `notApplicable` | Stripe refuse à l'ouverture de Checkout : code « première transaction » sur un client existant, montant minimum non atteint, code réservé à un autre client, coupon limité à d'autres produits que ceux du panier. |

Autres cas :

- **La remise n'apparaît pas sur la page Facturation après paiement** : webhook non reçu (voir `stripe.md` § Diagnostic — `stripe listen` en dev, endpoint du Dashboard en production) ; ou l'abonnement est résilié (une remise n'est jamais affichée sur un abonnement `canceled`).
- **La remise apparaît sans code** : elle a été posée à la main sur le client ou l'abonnement (coupon sans code promo) — le coupon est affiché, c'est normal.
- **Le code marche en Test mais pas en production** : il faut le recréer dans le catalogue Live.
- Les restrictions de première transaction, de montant minimum, de client et de produits ne sont **pas** vérifiées par l'app avant l'ouverture de Checkout : elles ne remontent qu'à la création de la session, d'où le message générique `notApplicable`.

## 8. Ce que l'app ne fait pas

- Pas d'écran pour créer, lister ou désactiver des codes (tout se fait dans Stripe).
- Pas de cumul de codes : un seul code par checkout, et la première remise de l'abonnement est la seule affichée.
- Pas de champ « code promo » sur la page Stripe Checkout : l'app ne pose jamais `allow_promotion_codes` (incompatible avec la remise pré-appliquée). Un client qui n'a pas saisi son code dans l'app ne peut donc pas le saisir chez Stripe.
- Pas de code sur un abonnement existant : le champ est réservé à la souscription.
