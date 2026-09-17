import { test } from '@japa/runner'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import EmailQueueService from '#services/email_queue_service'
import QueueDedupService from '#services/queue_dedup_service'

/**
 * Photographie de ce que chaque `sendX` d'`EmailQueueService` transmet à
 * `QueueDedupService.enqueueUnique` (clé, job, file, payload), avec des
 * entrées fixes (vague 2.2). La mutualisation de la queue d'envoi doit
 * produire un diff nul sur ces fixtures.
 *
 * Régénérer après un changement de contenu **voulu** :
 *   UPDATE_EMAIL_FIXTURES=1 node ace test integration --files=services/email_queue_payloads
 */
interface Captured {
  key: string
  jobName: string
  queue: string
  payload: unknown
}

const FIXTURES_DIR = new URL('./__fixtures__/email_queue/', import.meta.url).pathname
const UPDATE = process.env.UPDATE_EMAIL_FIXTURES === '1'

const branding = { appName: 'Marina Nord', primaryColor: '#123456', logoUrl: null }
const tasks = [
  { id: 1, title: 'Vidange moteur', boatName: 'Hermione', dueAt: '2026-07-01' },
  { id: 2, title: 'Anodes', boatName: 'Pen Duick', dueAt: null },
]

/** Entrées fixes de chaque envoi ; une clé = une fixture. */
const SCENARIOS: Record<string, (service: EmailQueueService) => Promise<unknown>> = {
  welcome: (s) => s.sendWelcome({ to: 'alice@example.com', name: 'Alice' }),
  welcomeNoName: (s) => s.sendWelcome({ to: 'alice@example.com', name: null }),
  passwordReset: (s) =>
    s.sendPasswordReset({ to: 'alice@example.com', resetUrl: 'https://app.test/reset/abc' }),
  invitation: (s) =>
    s.sendInvitation({
      to: 'bob@example.com',
      inviterName: 'Alice',
      orgName: 'Marina Nord',
      acceptUrl: 'https://app.test/invitations/xyz',
      branding,
    }),
  invitationAnonymous: (s) =>
    s.sendInvitation({
      to: 'bob@example.com',
      inviterName: null,
      orgName: 'Marina Nord',
      acceptUrl: 'https://app.test/invitations/xyz',
    }),
  reminderInactiveAccount: (s) =>
    s.sendReminderInactiveAccount({
      to: 'alice@example.com',
      name: 'Alice',
      orgName: 'Marina Nord',
    }),
  reminderIncompleteBoats: (s) =>
    s.sendReminderIncompleteBoats({
      to: 'alice@example.com',
      name: null,
      boats: [
        { id: 1, name: 'Hermione' },
        { id: 2, name: 'Pen Duick' },
      ],
      branding,
    }),
  reminderIncompletePorts: (s) =>
    s.sendReminderIncompletePorts({
      to: 'alice@example.com',
      name: 'Alice',
      ports: [{ id: 3, name: 'Port du Crouesty' }],
    }),
  reminderInactiveLogin: (s) =>
    s.sendReminderInactiveLogin({
      to: 'alice@example.com',
      name: 'Alice',
      lastLoginAt: '2026-05-01',
    }),
  reminderInactiveLoginNever: (s) =>
    s.sendReminderInactiveLogin({ to: 'alice@example.com', name: null, lastLoginAt: null }),
  reminderOverdueTasks: (s) =>
    s.sendReminderOverdueTasks({ to: 'alice@example.com', name: 'Alice', tasks, branding }),
  reminderEngineTasks: (s) =>
    s.sendReminderEngineTasks({ to: 'alice@example.com', name: 'Alice', tasks }),
  reminderBoatCheckTasks: (s) =>
    s.sendReminderBoatCheckTasks({ to: 'alice@example.com', name: null, tasks }),
  storageQuotaWarning80: (s) =>
    s.sendStorageQuotaWarning({
      to: 'alice@example.com',
      name: 'Alice',
      percent: 80,
      orgName: 'Marina Nord',
      correlationSuffix: '42:80',
      branding,
    }),
  storageQuotaWarning100: (s) =>
    s.sendStorageQuotaWarning({
      to: 'alice@example.com',
      name: null,
      percent: 100,
      orgName: 'Marina Nord',
      correlationSuffix: '42:100',
    }),
  aiTokenQuotaWarning80: (s) =>
    s.sendAiTokenQuotaWarning({
      to: 'alice@example.com',
      name: 'Alice',
      percent: 80,
      orgName: 'Marina Nord',
      correlationSuffix: '42:2026-07:80',
    }),
  aiTokenQuotaWarning100: (s) =>
    s.sendAiTokenQuotaWarning({
      to: 'alice@example.com',
      name: 'Alice',
      percent: 100,
      orgName: 'Marina Nord',
      correlationSuffix: '42:2026-07:100',
      branding,
    }),
  reminderDocumentExpiry30: (s) =>
    s.sendReminderDocumentExpiry({
      to: 'alice@example.com',
      name: 'Alice',
      documents: [
        {
          id: 7,
          boatName: 'Hermione',
          documentType: 'insurance',
          customTypeLabel: null,
          expiresAt: '2026-08-01',
          daysUntilExpiry: 30,
        },
      ],
      daysLabel: '30',
    }),
  reminderDocumentExpiry7: (s) =>
    s.sendReminderDocumentExpiry({
      to: 'alice@example.com',
      name: null,
      documents: [
        {
          id: 8,
          boatName: 'Pen Duick',
          documentType: 'other',
          customTypeLabel: 'Certificat radio',
          expiresAt: '2026-07-08',
          daysUntilExpiry: 7,
        },
      ],
      daysLabel: '7',
      branding,
    }),
  planDowngrade: (s) =>
    s.sendPlanDowngradeNotification({
      to: 'alice@example.com',
      name: 'Alice',
      orgName: 'Marina Nord',
      orgId: 42,
      fromPlan: 'pro',
      toPlan: 'starter',
      branding,
    }),
  moduleDeactivated: (s) =>
    s.sendModuleDeactivatedNotification({
      to: 'alice@example.com',
      name: null,
      orgName: 'Marina Nord',
      orgId: 42,
      module: 'charter',
      moduleName: 'Location',
    }),
  contactMessageNotification: (s) =>
    s.sendContactMessageNotification({
      to: 'contact@fleetai.app',
      messageId: 'msg-1',
      subjectLabel: 'Demande de démo',
      fullName: 'Alice Martin',
      email: 'alice@example.com',
      organization: 'Marina Nord',
      fleetSize: '10-50',
      message: 'Bonjour, je souhaite une démo.',
      locale: 'fr',
    }),
  contactMessageNotificationMinimal: (s) =>
    s.sendContactMessageNotification({
      to: 'contact@fleetai.app',
      messageId: 'msg-2',
      subjectLabel: 'Question',
      fullName: 'Bob Smith',
      email: 'bob@example.com',
      organization: null,
      fleetSize: null,
      message: 'Hello, quick question.',
      locale: 'en',
    }),
  contactMessageAck: (s) =>
    s.sendContactMessageAck({
      to: 'alice@example.com',
      messageId: 'msg-1',
      firstName: 'Alice',
      message: 'Bonjour, je souhaite une démo.',
      locale: 'fr',
    }),
  contactMessageAckEn: (s) =>
    s.sendContactMessageAck({
      to: 'bob@example.com',
      messageId: 'msg-2',
      firstName: 'Bob',
      message: 'Hello, quick question.',
      locale: 'en',
    }),
  invoice: (s) =>
    s.sendInvoice({ invoiceId: 9, organizationId: 42, to: 'client@example.com', locale: 'fr' }),
  rentalContract: (s) =>
    s.sendRentalContract({
      contractId: 5,
      organizationId: 42,
      to: 'client@example.com',
      locale: 'en',
    }),
}

/** Neutralise l'horodatage des clés « à la demande » et le port aléatoire d'APP_URL en test. */
function normalize(captured: Captured): Captured {
  const json = JSON.stringify(captured)
    .replace(/:(\d{13})(?=["\\])/g, ':<ts>')
    .replace(/:(\d{4})-(\d{2})(?=["\\])/g, ':<yyyy-MM>')
    .replace(/http:\/\/localhost:\d+/g, '<app-url>')
  return JSON.parse(json) as Captured
}

test.group('EmailQueueService — payloads snapshot (integration)', (group) => {
  let captured: Captured[] = []

  group.each.setup(() => {
    captured = []
    app.container.swap(
      QueueDedupService,
      () =>
        ({
          enqueueUnique: async (options: Captured & { dispatch: unknown }) => {
            captured.push({
              key: options.key,
              jobName: options.jobName,
              queue: options.queue,
              payload: options.payload,
            })
            return { enqueued: true }
          },
        }) as unknown as QueueDedupService
    )
    return () => app.container.restore(QueueDedupService)
  })

  for (const [name, run] of Object.entries(SCENARIOS)) {
    test(`${name} enqueues the same job as its fixture`, async ({ assert }) => {
      const service = await app.container.make(EmailQueueService)
      await run(service)

      assert.lengthOf(captured, 1)
      const actual = normalize(captured[0])

      const file = join(FIXTURES_DIR, `${name}.json`)
      if (UPDATE || !existsSync(file)) {
        mkdirSync(FIXTURES_DIR, { recursive: true })
        writeFileSync(file, JSON.stringify(actual, null, 2) + '\n')
      }

      const expected = JSON.parse(readFileSync(file, 'utf8')) as Captured
      assert.deepEqual(actual, expected)
    })
  }
})
