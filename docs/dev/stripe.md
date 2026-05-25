# Stripe — Configuration et utilisation

> Guide opérationnel : variables d'environnement, dev local, mise en production.  
> Pour l'architecture technique (webhooks, services, quotas), voir [`docs/billing-and-quotas.md`](../billing-and-quotas.md).

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Oui | Clé secrète API (`sk_live_...` en prod, `sk_test_...` en dev) |
| `STRIPE_WEBHOOK_SECRET` | Oui | Secret de signature webhook (`whsec_...`) |
| `STRIPE_PUBLIC_KEY` | Non | Clé publique (`pk_live_...` / `pk_test_...`) |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Oui | Price ID mensuel plan Pro (`price_...`) |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Oui | Price ID annuel plan Pro (`price_...`) |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Oui | Price ID mensuel plan Enterprise (`price_...`) |
| `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID` | Oui | Price ID annuel plan Enterprise (`price_...`) |
| `STRIPE_CUSTOMER_PORTAL_ID` | Non | ID config Customer Portal (`bpc_...`) |

⚠️ Les Price IDs commencent par `price_` — ne pas confondre avec les Product IDs (`prod_`).  
Si `STRIPE_SECRET_KEY` est absent, l'app flash un message d'erreur et ne crashe pas.

---

## Dev local

### 1. Clés de test

Dans le [dashboard Stripe](https://dashboard.stripe.com/test/apikeys) (mode **Test**), récupérer :
- `sk_test_...` → `STRIPE_SECRET_KEY`
- `pk_test_...` → `STRIPE_PUBLIC_KEY`

### 2. Price IDs de test

Dans le dashboard → **Products** → créer ou ouvrir un produit → onglet **Pricing** → copier les IDs qui commencent par `price_` pour chaque plan/intervalle.

### 3. Recevoir les webhooks en local

Installer le [Stripe CLI](https://stripe.com/docs/stripe-cli) puis :

```bash
# Première utilisation ou si clé expirée
stripe login

# Forwarder les webhooks vers l'app locale
stripe listen --forward-to localhost:5555/webhooks/stripe
```

Le CLI affiche un secret temporaire :

```
Your webhook signing secret is whsec_xxx...
```

Copier ce `whsec_...` dans `.env` :

```
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

Redémarrer le serveur. Le CLI affiche `[200]` à chaque webhook traité avec succès.

### 4. Exemple de `.env` complet en dev

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...          # fourni par stripe listen
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_...
```

### 5. Cartes de test

| Numéro | Résultat |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0000 0000 0002` | Carte refusée |
| `4000 0025 0000 3155` | Authentification 3D Secure requise |
| `4000 0000 0000 9995` | Fonds insuffisants |

Date d'expiration : n'importe quelle date future. CVC : n'importe quels 3 chiffres.

### 6. Réinitialiser un customer Stripe en dev

Si le `stripeCustomerId` stocké en base appartient au mode live (ou à un ancien test), le vider pour qu'il soit recréé :

```bash
node ace repl
```

```js
const { default: Organization } = await import('#models/organization')
const org = await Organization.findBy('stripe_customer_id', 'cus_xxx...')
org.stripeCustomerId = null
await org.save()
```

---

## Production

### 1. Clés live

Dans le [dashboard Stripe](https://dashboard.stripe.com/apikeys) (mode **Live**) :
- `sk_live_...` → `STRIPE_SECRET_KEY`
- `pk_live_...` → `STRIPE_PUBLIC_KEY`

### 2. Price IDs live

Mêmes étapes qu'en dev mais en mode **Live**. Les `price_...` de test et de prod sont différents.

### 3. Configurer le webhook

Dans le dashboard → **Developers** → **Webhooks** → **Add endpoint** :

- **URL** : `https://ton-domaine.com/webhooks/stripe`
- **Events** :
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Après création, cliquer sur l'endpoint → **Signing secret** → **Reveal** → copier le `whsec_...` → variable d'env `STRIPE_WEBHOOK_SECRET`.

⚠️ Le `whsec_` du CLI (`stripe listen`) est différent de celui du dashboard — ne pas les mélanger.

### 4. Customer Portal (optionnel)

Dans le dashboard → **Settings** → **Billing** → **Customer portal** : configurer les options (annulation, switch plan, gestion CB), puis copier l'ID de configuration (`bpc_...`) → `STRIPE_CUSTOMER_PORTAL_ID`.

Sans cet ID, le portal s'ouvre avec la configuration par défaut de Stripe.

### 5. Exemple de variables d'env en prod

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...          # depuis le dashboard, pas le CLI
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_...
STRIPE_CUSTOMER_PORTAL_ID=bpc_...        # optionnel
```

---

## Diagnostic

| Symptôme | Cause probable | Solution |
|---|---|---|
| Flash "Le paiement n'est pas encore configuré" | `STRIPE_SECRET_KEY` absent ou `STRIPE_*_PRICE_ID` manquant | Vérifier les env vars |
| Erreur Stripe "No such customer … test mode key" | Customer créé en live, clé test utilisée | Vider `stripeCustomerId` en base (voir §dev 6) |
| Webhook `[400] Invalid signature` | `STRIPE_WEBHOOK_SECRET` absent ou mauvais | Copier le bon `whsec_` (CLI en dev, dashboard en prod) |
| Webhook `[302]` | Route exclue du CSRF ? Redémarrage manquant ? | Vérifier `config/shield.ts → exceptRoutes: ['/webhooks/stripe']` + redémarrer |
| Abonnement non mis à jour après paiement | Webhook non reçu | Vérifier `stripe listen` en dev ou la config webhook dashboard en prod |
| CLI Stripe `Authorization failed, api_key_expired` | Clé CLI expirée | Relancer `stripe login` |
