<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { SupplierRow } from '#shared/types/inventory'

/**
 * Commande en un clic (#892) : un brouillon reprend les articles sous leur
 * seuil dont c'est le fournisseur habituel, remontés au double du seuil.
 */
const props = defineProps<{ suppliers: SupplierRow[] }>()

const { t } = useT()
const supplierId = ref<number | ''>(props.suppliers[0]?.id ?? '')
const processing = ref(false)

const options = computed(() => props.suppliers.map((s) => ({ value: s.id, label: s.name })))

function submit() {
  if (supplierId.value === '') return
  router.post(
    '/inventory/orders/reorder',
    { supplierId: supplierId.value },
    {
      preserveScroll: true,
      onStart: () => (processing.value = true),
      onFinish: () => (processing.value = false),
    }
  )
}
</script>

<template>
  <form
    class="flex flex-col gap-3 sm:flex-row sm:items-end"
    data-testid="reorder-form"
    @submit.prevent="submit"
  >
    <div class="w-full sm:max-w-xs">
      <BaseSelect
        v-model="supplierId"
        :label="t('inventory.orders.reorder.supplier')"
        :hint="t('inventory.orders.reorder.hint')"
        :options="options"
      />
    </div>
    <BaseButton type="submit" variant="secondary" :disabled="processing || supplierId === ''">
      {{ t('inventory.orders.reorder.submit') }}
    </BaseButton>
  </form>
</template>
