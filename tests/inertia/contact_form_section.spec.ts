import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ContactFormSection from '../../inertia/components/marketing/contact/ContactFormSection.vue'
import ContactChannelsSection from '../../inertia/components/marketing/contact/ContactChannelsSection.vue'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockForm = vi.hoisted(() => ({
  subject: 'demo',
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
  fleetSize: '5-20',
  message: '',
  consent: true,
  locale: 'fr',
  errors: {} as Record<string, string>,
  processing: false,
  post: mockFormPost,
  reset: vi.fn(),
  clearErrors: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a data-link :href="href"><slot /></a>',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'href', 'route'],
  },
}))

const formProps = {
  anchorId: 'contact-form',
  action: '/contact',
  eyebrow: 'FORMULAIRE',
  title: 'Écris-nous.',
  subjectLabel: 'Sujet',
  subjects: [
    { value: 'demo', label: 'Demo' },
    { value: 'pricing', label: 'Tarifs' },
  ],
  fleetSizes: ['1-4', '5-20', '20+'],
  firstNameLabel: 'Prénom *',
  firstNamePlaceholder: 'Marc',
  lastNameLabel: 'Nom *',
  lastNamePlaceholder: 'Lefèvre',
  emailLabel: 'Email pro *',
  emailPlaceholder: 'marc@marina-bleue.fr',
  orgLabel: 'Organisation',
  orgPlaceholder: 'Marina Bleue',
  fleetSizeLabel: 'Taille de flotte',
  messageLabel: 'Message',
  messagePlaceholder: 'Quelques mots…',
  privacyText: "J'accepte…",
  privacyLinkLabel: 'Politique de confidentialité',
  submitLabel: 'Envoyer',
  sendingLabel: 'Envoi…',
  successTitle: 'Message envoyé.',
  successBody: 'On te répond sous 4 heures.',
  successNewLabel: 'Écrire un autre message',
  errorGeneric: "L'envoi a échoué.",
  responseTime: 'Réponse garantie sous 4 heures.',
  otherMeansTitle: 'AUTRES MOYENS',
  sidebarContacts: [
    { icon: '✉', label: 'hello@fleetai.app', sub: 'général', href: 'mailto:hello@fleetai.app' },
  ],
  ctaTitle: 'Teste FleetAi',
  ctaSubtitle: '14 jours gratuits',
  ctaButton: 'Créer mon organisation',
  sent: false,
}

describe('ContactFormSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForm.errors = {}
    mockForm.processing = false
  })

  test('submits to the contact route instead of being a dead anchor', async () => {
    const wrapper = mount(ContactFormSection, { props: formProps })

    await wrapper.find('form').trigger('submit')

    expect(mockFormPost).toHaveBeenCalledWith(
      '/contact',
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('renders a real submit button, not a link', () => {
    const wrapper = mount(ContactFormSection, { props: formProps })
    const submit = wrapper.findAll('button').find((b) => b.text() === 'Envoyer')

    expect(submit).toBeDefined()
    expect(submit!.attributes('type')).toBe('submit')
  })

  test('shows field errors and the generic error line', () => {
    mockForm.errors = { email: 'Email invalide' }
    const wrapper = mount(ContactFormSection, { props: formProps })

    expect(wrapper.text()).toContain('Email invalide')
    expect(wrapper.text()).toContain("L'envoi a échoué.")
  })

  test('renders the confirmation panel when the server flagged the message as sent', () => {
    const wrapper = mount(ContactFormSection, { props: { ...formProps, sent: true } })

    expect(wrapper.text()).toContain('Message envoyé.')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  test('sidebar contacts are mailto links', () => {
    const wrapper = mount(ContactFormSection, { props: formProps })

    expect(wrapper.find('a[href="mailto:hello@fleetai.app"]').exists()).toBe(true)
  })
})

describe('ContactChannelsSection', () => {
  const items = [
    {
      icon: '✦',
      title: 'Démo',
      desc: '20 min',
      cta: 'Réserver un créneau',
      tone: 'navy',
      href: '#contact-form',
      kind: 'anchor' as const,
    },
    {
      icon: '▶',
      title: 'Tester',
      desc: '14 jours',
      cta: 'Créer mon compte',
      tone: 'coral',
      href: '/signup',
      kind: 'internal' as const,
    },
    {
      icon: '👤',
      title: 'Support',
      desc: 'sous 4h',
      cta: 'support@fleetai.app',
      href: 'mailto:support@fleetai.app',
      kind: 'external' as const,
    },
  ]

  test('every CTA card is a link, not a decorative paragraph', () => {
    const wrapper = mount(ContactChannelsSection, { props: { items } })

    expect(wrapper.find('a[href="#contact-form"]').exists()).toBe(true)
    expect(wrapper.find('a[href="mailto:support@fleetai.app"]').exists()).toBe(true)
    expect(wrapper.find('[data-link][href="/signup"]').exists()).toBe(true)
  })
})
