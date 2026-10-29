<script setup>
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
const route = useRoute()
const isLogin = computed(() => route.name === 'login')
</script>
<template>
  <RouterView v-if="isLogin" />
  <AppShell v-else><RouterView /></AppShell>
</template>
