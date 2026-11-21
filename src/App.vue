<script setup>
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
const route = useRoute()
const mostrarPanel = computed(() => route.meta.requiereAuth === true)
</script>
<template>
  <AppShell v-if="mostrarPanel"><RouterView /></AppShell>
  <RouterView v-else :key="route.fullPath" />
</template>
