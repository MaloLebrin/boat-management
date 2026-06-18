---
name: new-job
description: >
  Crée un background job AdonisJS Queue dans ce projet. Deux modes : queue (dispatch manuel
  depuis un service) ou cron (scheduler). Génère le job, le dispatch dans le service appelant,
  et l'inscription dans start/scheduler.ts si cron. Ex: /new-job send_welcome_email queue
---

# Nouveau job : $ARGUMENTS

Format attendu : `<job_name> <queue|cron>`. Lis les jobs existants dans `app/jobs/` avant d'écrire.

## Fichiers à créer/modifier

**1. `app/jobs/<job_name>.ts`**

```ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import <Service> from '#services/<service>'

export interface <JobName>Payload {
  // champs du payload — vide si cron : Record<string, never>
}

@inject()
export default class <JobName> extends Job<<JobName>Payload> {
  static options: JobOptions = {
    queue: '<queue_name>', // 'default' | 'emails' | 'ai'
    maxRetries: 3,
  }

  constructor(private service: <Service>) {
    super()
  }

  async execute() {
    logger.info('<JobName>: starting')
    // logique principale
    logger.info('<JobName>: done')
  }

  async failed(error: Error) {
    logger.error({ error }, '<JobName>: failed after max retries')
  }
}
```

**2. Dispatch depuis le service appelant**

```ts
// Dans le service qui déclenche le job
await <JobName>.dispatch({ /* payload */ })

// Avec délai (optionnel)
await <JobName>.dispatch({ /* payload */ }).in('3d')
```

**3. Si cron — `start/scheduler.ts`** (ajouter en bas du fichier)

```ts
import <JobName> from '#jobs/<job_name>'

await <JobName>.schedule({})
  .cron('0 8 * * *')        // adapter le cron
  .timezone('Europe/Paris')
  .id('<kebab-id-unique>')
  .run()
```

## Règles

- `@inject()` + services dans le constructeur — jamais `new X()` inline
- `execute()` : logique principale avec logs `logger.info` début + fin
- `failed()` : toujours implémenter — log l'erreur, tenter une récupération si possible
- Queues disponibles : `default`, `emails`, `ai` — choisir selon le type de tâche
- Cron : id unique en kebab-case, timezone `Europe/Paris` systématiquement

## Checklist

- [ ] `npx tsc --noEmit` OK
- [ ] Le job est dispatché depuis le bon service (pas depuis un controller)
- [ ] `failed()` implémentée
- [ ] Si cron : inscription dans `start/scheduler.ts` avec id unique
- [ ] Changelog mis à jour (`docs/changelog.md`)
