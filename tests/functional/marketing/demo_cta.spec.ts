import { test } from '@japa/runner'
import type { AboutPageProps, HelpPageProps } from '../../../shared/types/marketing.js'

/**
 * CTA démo du site marketing : on ne « réserve » pas de démo — chaque CTA démo
 * lance la session de démo autonome (POST /demo, libre accès sans inscription),
 * le formulaire de contact restant la voie pour parler à l'équipe. Ces tests
 * verrouillent la cible `/demo` des props et l'absence de toute promesse de
 * réservation dans la copie rendue.
 */

const DEMO_LOGIN_PATH = '/demo'

/** Formulations « réservation de démo » bannies de la copie marketing. */
const BOOKING_PHRASES = ['Réserver une démo', 'Réserver un créneau', 'Book a demo', 'Book a slot']

const PAGES = {
  home: { fr: '/fr', en: '/en' },
  pricing: { fr: '/fr/tarifs', en: '/en/pricing' },
  about: { fr: '/fr/a-propos', en: '/en/about' },
  contact: { fr: '/fr/contact', en: '/en/contact' },
  help: { fr: '/fr/aide', en: '/en/help' },
} as const

test.group('CTA démo autonome (marketing)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] aucune page marketing ne promet de réserver une démo`, async ({
      client,
      assert,
    }) => {
      for (const [page, urls] of Object.entries(PAGES)) {
        const response = await client.get(urls[locale]).withInertia()
        response.assertStatus(200)

        const serialized = JSON.stringify(response.body().props)
        for (const phrase of BOOKING_PHRASES) {
          assert.notInclude(serialized, phrase, `« ${phrase} » trouvé sur la page ${page}`)
        }
      }
    })

    test(`[${locale}] home : les CTA secondaires ciblent la démo autonome`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(PAGES.home[locale]).withInertia()
      response.assertStatus(200)

      const props = response.body().props as {
        t: { home: { demo: { demoLoginPath: string } } }
      }
      assert.equal(props.t.home.demo.demoLoginPath, DEMO_LOGIN_PATH)
    })

    test(`[${locale}] tarifs et à-propos : le CTA final expose la route de démo`, async ({
      client,
      assert,
    }) => {
      const pricing = await client.get(PAGES.pricing[locale]).withInertia()
      pricing.assertStatus(200)
      const pricingProps = pricing.body().props as {
        t: { pricing: { finalCta: { demoLoginPath: string } } }
      }
      assert.equal(pricingProps.t.pricing.finalCta.demoLoginPath, DEMO_LOGIN_PATH)

      const about = await client.get(PAGES.about[locale]).withInertia()
      about.assertStatus(200)
      const aboutProps = about.body().props as unknown as AboutPageProps
      assert.equal(aboutProps.t.about.finalCta.demoLoginPath, DEMO_LOGIN_PATH)
    })

    test(`[${locale}] contact : la première carte lance la démo autonome`, async ({
      client,
      assert,
    }) => {
      const response = await client.get(PAGES.contact[locale]).withInertia()
      response.assertStatus(200)

      const props = response.body().props as {
        t: { contact: { channels: { kind: string; href: string }[] } }
      }
      const demoChannel = props.t.contact.channels[0]
      assert.equal(demoChannel.kind, 'demo')
      assert.equal(demoChannel.href, DEMO_LOGIN_PATH)
    })

    test(`[${locale}] aide : la carte démo lance la démo autonome`, async ({ client, assert }) => {
      const response = await client.get(PAGES.help[locale]).withInertia()
      response.assertStatus(200)

      const props = response.body().props as unknown as HelpPageProps
      const demoChannel = props.t.channels.find((channel) => channel.demo)
      assert.exists(demoChannel, 'aucune carte démo sur la page aide')
      assert.equal(demoChannel!.href, DEMO_LOGIN_PATH)
    })
  }
})
