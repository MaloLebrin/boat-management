---
name: new-event-listener
description: >
  Crée une paire Event + Listener AdonisJS dans ce projet et les câble dans start/events.ts.
  Génère l'event, le listener, le dispatch depuis un service, et l'enregistrement dans
  start/events.ts. Ex: /new-event-listener boat_archived
---

# Nouvel event + listener : $ARGUMENTS

Lis `start/events.ts` et les fichiers existants dans `app/events/` et `app/listeners/` avant d'écrire.

## Fichiers à créer/modifier

**1. `app/events/<event_name>.ts`**

```ts
import type <Model> from '#models/<model>'
import { BaseEvent } from '@adonisjs/core/events'

export default class <EventName> extends BaseEvent {
  constructor(public readonly <entity>: <Model>) {
    super()
  }
}
```

Dispatch hérité de `BaseEvent` — pas besoin de l'implémenter.

**2. `app/listeners/<listener_name>.ts`**

Convention de nommage : `on_<event_name>.ts` si réaction directe, ou `send_<action>_notification.ts` si notification.

```ts
import type <EventName> from '#events/<event_name>'
import <Service> from '#services/<service>'
import { inject } from '@adonisjs/core'

@inject()
export default class <ListenerName> {
  constructor(private service: <Service>) {}

  async handle(event: <EventName>) {
    // logique de réaction à l'événement
  }
}
```

**3. Dispatch depuis le service appelant**

```ts
import <EventName> from '#events/<event_name>'

// Dans la méthode du service, après l'action principale
await <EventName>.dispatch(<entity>)
```

**4. `start/events.ts`** — ajouter le câblage

```ts
import <EventName> from '#events/<event_name>'
import { listeners } from '#generated/listeners' // si auto-generated, sinon import direct

emitter.listen(<EventName>, [() => import('#listeners/<listener_name>')])
```

Un event peut avoir plusieurs listeners :

```ts
emitter.listen(<EventName>, [
  () => import('#listeners/<listener_a>'),
  () => import('#listeners/<listener_b>'),
])
```

## Règles

- Event : `extends BaseEvent`, payload en propriétés `readonly` dans le constructeur
- Listener : `@inject()` si services nécessaires, méthode `handle(event: EventType)`
- Dispatch toujours depuis un **service**, jamais depuis un controller
- Un listener = une responsabilité (ne pas tout mettre dans un seul listener)
- Après création : `node ace generate:manifest` pour mettre à jour `.adonisjs/server/listeners.ts`

## Checklist

- [ ] `npx tsc --noEmit` OK
- [ ] Event câblé dans `start/events.ts`
- [ ] `node ace generate:manifest` exécuté
- [ ] Dispatch dans le service (pas dans le controller)
- [ ] Changelog mis à jour (`docs/changelog.md`)
