# Domaine — Formulaire de contact public

## Objectif fonctionnel

Page publique (sans authentification) qui permet à un visiteur d'écrire à l'équipe FleetAi. C'est la destination du CTA « Réserver une demo » de la home (`marketing.home.demo.cta_href` → `/contact`) : la page annonce « Réponse garantie sous 4 heures en jours ouvrés », donc chaque envoi doit être persisté **et** notifié.

Avant #450 la page était entièrement décorative : « Envoyer » était un `<a href="#">`, aucune route POST n'existait, et les cartes CTA étaient de simples paragraphes.

---

## Tunnel

```
GET /fr/contact | /en/contact | /contact   (public, pas d'auth)
  → MarketingController#contact
    → prop `t` (marketing.contact2.*) + prop `contactSent` (flash)
  → POST /contact                          (contactThrottle : 5 envois / 10 min / IP)
    → ContactMessagesController#store
      → contactMessageValidator (VineJS)
      → ContactMessageService#create
        → insert contact_messages
        → ContactMessageReceived.dispatch
          → OnContactMessageReceived
            → EmailQueueService#sendContactMessageNotification  (boîte équipe)
            → EmailQueueService#sendContactMessageAck           (expéditeur)
      → session.flash('contactMessageSent', true)
      → redirect().back()
```

Le formulaire poste toujours sur `/contact`, quelle que soit la locale de l'URL de rendu : la locale du message est transmise dans le payload (repli sur `i18n.locale`).

---

## Routes

Référence : `start/routes/marketing.ts`

| Méthode | URL           | Nom                       | Controller                        |
| ------- | ------------- | ------------------------- | --------------------------------- |
| GET     | `/fr/contact` | `marketing.fr.contact`    | `MarketingController#contact`     |
| GET     | `/en/contact` | `marketing.en.contact`    | `MarketingController#contact`     |
| GET     | `/contact`    | `marketing.contact`       | `MarketingController#contact`     |
| POST    | `/contact`    | `marketing.contact.store` | `ContactMessagesController#store` |

La route POST est publique et protégée par `contactThrottle` (`start/limiter.ts`) : 5 requêtes par IP et par tranche de 10 minutes.

---

## Types partagés

Référence : `shared/types/contact.ts`

```typescript
type ContactSubject = 'demo' | 'pricing' | 'migration' | 'technical' | 'partnership' | 'other'
type ContactFleetSize = '1-4' | '5-20' | '20+'

interface ContactMessagePayload {
  subject: ContactSubject
  firstName: string
  lastName: string
  email: string
  organization?: string | null
  fleetSize?: ContactFleetSize | null
  message: string
  consent: true
  locale?: string
}
```

Les sujets sont stockés sous leur **valeur canonique** (anglais, stable). Le libellé affiché vient de `marketing.contact2.form_subject_<valeur>` dans les deux locales — c'est aussi la clé que le listener relit pour composer le sujet de l'email de notification.

---

## Validation backend

Référence : `app/validators/contact.ts`

`contactMessageValidator` est le miroir exact des champs rendus par `ContactFormSection.vue` — tout champ ajouté ici doit avoir un input, sinon son erreur est invisible et l'envoi échoue silencieusement (même classe de bug que #448).

- `subject` : `vine.enum(CONTACT_SUBJECTS)`
- `firstName` / `lastName` : `trim`, 1–100
- `email` : `email()`, 254 max, `normalizeEmail()`
- `organization` : `trim`, 255 max, `nullable().optional()`
- `fleetSize` : `vine.enum(CONTACT_FLEET_SIZES)`, `nullable().optional()`
- `message` : `trim`, 10–5000
- `consent` : `vine.accepted()` — message dédié `consent.accepted` dans `validator.json`
- `locale` : optionnel, 10 max

---

## Persistance

Référence : `app/models/contact_message.ts`, migration `1824000000000_create_contact_messages_table.ts`

Table `contact_messages` autonome (aucun lien vers `users`/`organizations` : l'expéditeur n'est pas authentifié). `ipAddress` est renseigné pour tracer les envois derrière le throttle. Index sur `email` et `created_at`. Voir `docs/data/schema.md`.

---

## Emails

Référence : `app/listeners/on_contact_message_received.ts`, `app/services/email_queue_service.ts`

Deux emails partent par la queue `emails` existante, chacun dédupliqué sur l'id du message :

| Destinataire                                      | Sujet                                                                | Template                                   |
| ------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `CONTACT_INBOX_EMAIL` (repli `MAIL_FROM_ADDRESS`) | `[Contact] <sujet> — <nom>`                                          | `emails/contact_message_notification.edge` |
| l'expéditeur                                      | `Message bien reçu — FleetAi` / `We received your message — FleetAi` | `emails/contact_message_ack.edge`          |

Les deux templates reçoivent `messageLines` (le message découpé sur `\n`) et rendent un `<p>` par ligne : le rendu ne dépend pas de l'indentation du template, contrairement à un bloc `white-space: pre-wrap`.

---

## Frontend

Référence : `inertia/components/marketing/contact/`

- `ContactFormSection.vue` — `useForm` + `form.post('/contact', { preserveScroll: true })`. Chaque champ a son `v-model`, son `id`/`for`, son `autocomplete` et son erreur affichée dessous ; le bouton est un `type="submit"` désactivé pendant l'envoi.
- Le panneau de confirmation remplace le formulaire après `onSuccess`, **et** au rendu serveur quand la prop `contactSent` est vraie (flash relu par `MarketingController#contact`) — il survit donc à un rechargement complet.
- `ContactFormSidebar.vue` (contacts `tel:`/`mailto:` + carte CTA navy) et `ContactPillGroup.vue` (pastilles sujet et taille de flotte) sont extraits pour tenir la limite de 250 lignes par composant.
- `ContactChannelsSection.vue` — chaque carte porte un `href` et un `kind` fournis par le contrôleur : `anchor` (`#contact-form`), `internal` (`<Link>` vers `/signup`), `external` (`mailto:`).

---

## Configuration

| Variable              | Rôle                          | Défaut                     |
| --------------------- | ----------------------------- | -------------------------- |
| `CONTACT_INBOX_EMAIL` | Boîte qui reçoit les messages | vide → `MAIL_FROM_ADDRESS` |

En test, `.env.test` fixe `contact-test@fleetai.app` pour que les assertions sur le destinataire soient déterministes.

---

## Tests

- `tests/functional/contact.spec.ts` (8) — stockage des champs, envoi des deux emails aux bonnes adresses, et rejet sans écriture pour : email invalide, consentement absent, sujet inconnu, message trop court. Un envoi sans organisation ni taille de flotte passe.
- `tests/inertia/contact_form_section.spec.ts` (6) — la soumission appelle `/contact`, le bouton est un `submit` et non une ancre, les erreurs s'affichent, le panneau de confirmation remplace le formulaire, chaque carte CTA est un lien.
