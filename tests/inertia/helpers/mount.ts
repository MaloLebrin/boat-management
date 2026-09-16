import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import {
  forms,
  formSpies,
  pageState,
  resetInertiaMock,
  routerSpies,
  type ResetInertiaMockOptions,
} from './inertia_mock'

export { forms, formSpies, pageState, resetInertiaMock, routerSpies }

/**
 * Doublons uniformes des composants `base/*` (#refacto 0.2).
 *
 * Avant ce fichier, 59 specs redéclaraient leur propre `BaseButton` — certains
 * transmettaient `disabled`/`type`/`@click`, d'autres non : le même composant
 * se comportait différemment selon la spec qui tournait. Ici chaque doublon
 * rend la sémantique minimale du vrai composant (attributs, `v-model`,
 * événements, slots) sans son habillage, et se repère par un attribut
 * `data-base-*`.
 *
 * Pour garder le vrai composant sur un point précis (une classe de variante,
 * par exemple) : `stubs: { BaseBadge: false }`.
 */
export const BASE_STUBS = {
  BaseButton: {
    name: 'BaseButton',
    props: [
      'variant',
      'size',
      'disabled',
      'type',
      'route',
      'params',
      'href',
      'externalHref',
      'target',
      'rel',
      'method',
      'preserveScroll',
      'preserveState',
      'replace',
    ],
    emits: ['click'],
    template:
      '<a v-if="href || route" data-base-button :href="href ?? route"><slot /></a>' +
      '<button v-else data-base-button :type="type ?? \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  BaseInput: {
    name: 'BaseInput',
    props: [
      'label',
      'hint',
      'error',
      'errors',
      'errorKey',
      'id',
      'name',
      'type',
      'autocomplete',
      'placeholder',
      'modelValue',
      'disabled',
      'step',
      'min',
      'max',
      'inputmode',
      'pattern',
      'required',
      'readonly',
    ],
    emits: ['update:modelValue'],
    template:
      '<div data-base-input><label v-if="label" :for="id">{{ label }}</label>' +
      '<input :id="id" :name="name" :type="type ?? \'text\'" :value="modelValue" :disabled="disabled" :required="required" :readonly="readonly" :placeholder="placeholder" :step="step" :min="min" :max="max" @input="$emit(\'update:modelValue\', $event.target.value)" />' +
      '<slot name="trailing" /></div>',
  },
  BaseSelect: {
    name: 'BaseSelect',
    props: [
      'label',
      'hint',
      'error',
      'errors',
      'errorKey',
      'id',
      'name',
      'modelValue',
      'disabled',
      'required',
      'placeholder',
      'allowEmpty',
      'options',
    ],
    emits: ['update:modelValue'],
    template:
      '<div data-base-select><label v-if="label" :for="id">{{ label }}</label>' +
      '<select :id="id" :name="name" :value="modelValue" :disabled="disabled" :required="required" @change="$emit(\'update:modelValue\', $event.target.value)">' +
      '<option v-if="placeholder || allowEmpty" value="">{{ placeholder }}</option>' +
      '<option v-for="option in options" :key="String(option.value)" :value="option.value">{{ option.label }}</option>' +
      '</select></div>',
  },
  BaseTextarea: {
    name: 'BaseTextarea',
    props: [
      'label',
      'hint',
      'error',
      'errors',
      'errorKey',
      'id',
      'name',
      'rows',
      'placeholder',
      'modelValue',
      'disabled',
      'maxlength',
      'required',
      'compact',
    ],
    emits: ['update:modelValue'],
    template:
      '<div data-base-textarea><label v-if="label" :for="id">{{ label }}</label>' +
      '<textarea :id="id" :name="name" :value="modelValue" :rows="rows" :disabled="disabled" :required="required" :placeholder="placeholder" :maxlength="maxlength" @input="$emit(\'update:modelValue\', $event.target.value)" />' +
      '</div>',
  },
  BaseCard: {
    name: 'BaseCard',
    props: ['padded', 'isAnimated'],
    template: '<div data-base-card><slot name="header" /><slot /><slot name="footer" /></div>',
  },
  BaseModal: {
    name: 'BaseModal',
    props: ['open', 'title', 'subtitle', 'closeLabel', 'size'],
    emits: ['update:open', 'close'],
    template:
      '<div v-if="open" data-base-modal role="dialog"><h2 v-if="title">{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p><slot /><slot name="footer" /></div>',
  },
  BaseConfirmModal: {
    name: 'BaseConfirmModal',
    props: ['open', 'title', 'message', 'confirmLabel', 'cancelLabel'],
    emits: ['update:open', 'confirm'],
    template:
      '<div v-if="open" data-base-confirm-modal role="alertdialog"><p>{{ title }}</p><p v-if="message">{{ message }}</p>' +
      '<button data-confirm @click="$emit(\'confirm\')">{{ confirmLabel }}</button>' +
      '<button data-cancel @click="$emit(\'update:open\', false)">{{ cancelLabel }}</button></div>',
  },
  BaseBadge: {
    name: 'BaseBadge',
    props: ['variant'],
    template: '<span data-base-badge :data-variant="variant ?? \'neutral\'"><slot /></span>',
  },
  BaseAlert: {
    name: 'BaseAlert',
    props: ['variant', 'title', 'dismissible', 'styled'],
    emits: ['dismiss'],
    template:
      '<div data-base-alert :data-variant="variant ?? \'info\'"><strong v-if="title">{{ title }}</strong><slot /><slot name="actions" /></div>',
  },
  BaseHeading: {
    name: 'BaseHeading',
    props: ['level', 'as'],
    template: '<h2 data-base-heading :data-level="level"><slot /></h2>',
  },
  BaseEmptyState: {
    name: 'BaseEmptyState',
    props: ['title', 'description', 'actionLabel'],
    emits: ['action'],
    template:
      '<div data-base-empty-state><p>{{ title }}</p><p v-if="description">{{ description }}</p>' +
      '<slot name="action"><button v-if="actionLabel" data-empty-action :data-label="actionLabel" @click="$emit(\'action\')">{{ actionLabel }}</button></slot></div>',
  },
  BaseSegmentedControl: {
    name: 'BaseSegmentedControl',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<div data-base-segmented-control><button v-for="option in options" :key="String(option.value)" type="button" :aria-pressed="option.value === modelValue" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></div>',
  },
}

type MountOptions = NonNullable<Parameters<typeof mount>[1]>

export interface MountWithStubsOptions extends ResetInertiaMockOptions {
  props?: Record<string, unknown>
  slots?: MountOptions['slots']
  attachTo?: MountOptions['attachTo']
  /**
   * Doublons supplémentaires (composants métier) ou désactivation d'un doublon
   * de base (`{ BaseBadge: false }` pour rendre le vrai composant).
   */
  stubs?: Record<string, unknown>
  /** Props partagées rendues par `usePage()` — alias lisible de `props` du mock. */
  pageProps?: Record<string, unknown>
}

/**
 * Monte un composant avec les doublons `base/*` uniformes et un `@inertiajs/vue3`
 * mocké (voir `inertia_mock.ts`). Les espions sont remis à zéro à chaque appel.
 *
 * Prérequis dans la spec : le `vi.mock('@inertiajs/vue3', …)` documenté dans
 * `inertia_mock.ts`.
 */
export function mountWithStubs(component: Component, options: MountWithStubsOptions = {}) {
  resetInertiaMock({ props: options.pageProps, locale: options.locale })
  return mount(component, {
    props: options.props,
    slots: options.slots,
    attachTo: options.attachTo,
    global: { stubs: { ...BASE_STUBS, ...options.stubs } },
  } as MountOptions)
}
