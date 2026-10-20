<script setup lang="ts">
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useT } from '~/composables/use_t'

defineProps<{ canManage: boolean }>()

const { t } = useT()
</script>

<template>
  <BaseEmptyState
    :title="t('instruments.empty.title')"
    :description="canManage ? t('instruments.empty.manage') : t('instruments.empty.readOnly')"
  />
</template>
