import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatSafetyCompliancePanel from '../../inertia/components/boats/safety/BoatSafetyCompliancePanel.vue'
import type { SafetyComplianceReport } from '../../shared/types/safety'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (iso: string) => `date(${iso})` }),
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span class="badge"><slot /></span>', props: ['variant'] },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    // Pas de `$emit('click')` : le clic natif retombe déjà sur l'écouteur parent,
    // et le ré-émettre ferait compter deux fois chaque clic.
    template: '<button :data-href="href"><slot /></button>',
    props: ['variant', 'size', 'type', 'href', 'route', 'params'],
  },
}))

function makeReport(overrides: Partial<SafetyComplianceReport> = {}): SafetyComplianceReport {
  return {
    zone: 'coastal',
    textVersion: '2024-01',
    maxPersons: 6,
    requirementCount: 6,
    satisfiedCount: 4,
    score: 67,
    issues: [],
    untrackedItemKeys: ['charts'],
    ...overrides,
  }
}

describe('BoatSafetyCompliancePanel (#582)', () => {
  test('sans zone déclarée, invite à la renseigner et ne liste rien', () => {
    const wrapper = mount(BoatSafetyCompliancePanel, {
      props: {
        boatId: 7,
        canManage: true,
        report: makeReport({ zone: null, score: null, requirementCount: 0, satisfiedCount: 0 }),
      },
    })

    expect(wrapper.text()).toContain('boats.safetyCompliance.noZone.description')
    expect(wrapper.find('[data-href="/boats/7/edit"]').exists()).toBe(true)
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  test('affiche le score, les écarts et la référence d’article', () => {
    const wrapper = mount(BoatSafetyCompliancePanel, {
      props: {
        boatId: 7,
        canManage: true,
        report: makeReport({
          issues: [
            {
              requirementKey: 'basic.life_jacket',
              equipmentType: 'life_jacket',
              kind: 'insufficient_quantity',
              labelKey: 'boats.safetyCompliance.requirements.basic.life_jacket',
              articleRef: '240-A.2',
              requiredQuantity: 6,
              currentQuantity: 2,
              dueDate: null,
              itemId: null,
              dueDateSource: null,
            },
          ],
        }),
      },
    })

    const text = wrapper.text()
    expect(text).toContain('boats.safetyCompliance.score:67')
    expect(text).toContain('boats.safetyCompliance.summary:4,6')
    expect(text).toContain('boats.safetyCompliance.status.insufficient_quantity')
    expect(text).toContain('boats.safetyCompliance.detail.quantity:2,6')
    expect(text).toContain('boats.safetyCompliance.articleRef:240-A.2')
  })

  test('un équipement manquant propose l’ajout pré-rempli sur son type', async () => {
    const wrapper = mount(BoatSafetyCompliancePanel, {
      props: {
        boatId: 7,
        canManage: true,
        report: makeReport({
          issues: [
            {
              requirementKey: 'semi_offshore.life_raft',
              equipmentType: 'life_raft',
              kind: 'missing',
              labelKey: 'boats.safetyCompliance.requirements.semi_offshore.life_raft',
              articleRef: '240-A.2',
              requiredQuantity: 1,
              currentQuantity: 0,
              dueDate: null,
              itemId: null,
              dueDateSource: null,
            },
          ],
        }),
      },
    })

    await wrapper.find('li button').trigger('click')
    expect(wrapper.emitted('addEquipment')).toEqual([['life_raft']])
  })

  test('sans droit de gestion, aucun bouton d’ajout n’est proposé', () => {
    const wrapper = mount(BoatSafetyCompliancePanel, {
      props: {
        boatId: 7,
        canManage: false,
        report: makeReport({
          issues: [
            {
              requirementKey: 'basic.anchor',
              equipmentType: 'anchor',
              kind: 'missing',
              labelKey: 'boats.safetyCompliance.requirements.basic.anchor',
              articleRef: '240-A.2',
              requiredQuantity: 1,
              currentQuantity: 0,
              dueDate: null,
              itemId: null,
              dueDateSource: null,
            },
          ],
        }),
      },
    })

    expect(wrapper.find('li button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('boats.safetyCompliance.addEquipment')
  })

  test('une échéance déduite du corpus est annoncée comme telle', () => {
    const wrapper = mount(BoatSafetyCompliancePanel, {
      props: {
        boatId: 7,
        canManage: true,
        report: makeReport({
          issues: [
            {
              requirementKey: null,
              equipmentType: 'flare',
              kind: 'expired',
              labelKey: 'boats.options.safetyEquipmentType.flare',
              articleRef: null,
              requiredQuantity: null,
              currentQuantity: null,
              dueDate: '2026-01-10',
              itemId: 42,
              dueDateSource: 'default',
            },
          ],
        }),
      },
    })

    const text = wrapper.text()
    expect(text).toContain('boats.safetyCompliance.detail.due:date(2026-01-10)')
    expect(text).toContain('boats.safetyCompliance.detail.defaultLifetime:')
    expect(text).toContain('boats.safetyCompliance.lifetimes.flare')
  })

  test('le disclaimer et la version du texte sont toujours affichés', () => {
    const wrapper = mount(BoatSafetyCompliancePanel, {
      props: { boatId: 7, canManage: false, report: makeReport({ zone: null, score: null }) },
    })

    expect(wrapper.text()).toContain('boats.safetyCompliance.disclaimer')
    expect(wrapper.text()).toContain('boats.safetyCompliance.textVersion:2024-01')
  })
})
