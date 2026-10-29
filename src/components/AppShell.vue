<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { useGruposStore } from '@/stores/grupos'
import { useDistribucionStore } from '@/stores/distribucion'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const grupos = useGruposStore()
const distribucion = useDistribucionStore()
const menuOpen = ref(false)
const busqueda = ref('')
watch(() => route.fullPath, () => { menuOpen.value = false })
const links = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/grupos', label: 'Grupos', icon: 'users' },
  { to: '/distribucion', label: 'Distribución', icon: 'ticket' },
  { to: '/pagos', label: 'Pagos', icon: 'credit' },
  { to: '/consulta', label: 'Consulta', icon: 'search' },
]
const nombreUsuario = computed(() => auth.usuario?.email?.split('@')[0] || 'Demo')
function buscar() {
  const n = String(busqueda.value).trim()
  if (n) router.push({ name:'consulta', query:{ numero:n } })
  menuOpen.value = false
}
async function salir() {
  try { await auth.cerrarSesion(); grupos.limpiar(); distribucion.limpiar(); await router.replace('/login') }
  catch(e) { alert(e.message || 'No se pudo cerrar sesión') }
}
</script>
<template>
  <div class="app-layout" @keydown.esc="menuOpen=false">
    <div v-if="menuOpen" class="mobile-overlay" @click="menuOpen=false"></div>
    <aside id="menu-principal" class="sidebar" :class="{ 'open':menuOpen }">
      <RouterLink to="/" class="brand" @click="menuOpen=false">
        <span class="brand-mark"><AppIcon name="ticket" :size="25" /></span>
        <span>Control de<br /><strong>Bingo</strong></span>
      </RouterLink>
      <div class="sidebar-caption">MENÚ PRINCIPAL</div>
      <nav aria-label="Menú principal">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="nav-link" :class="{ selected: route.path === link.to }" @click="menuOpen=false">
          <AppIcon :name="link.icon" :size="20"/><span>{{ link.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note"><AppIcon name="shield" :size="18" /><span>Modo demostración<br /><small>Control de inventario</small></span></div>
        <button class="sidebar-signout" @click="salir"><AppIcon name="logout" :size="19"/> Salir</button>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <button class="icon-button menu-toggle" aria-controls="menu-principal" :aria-expanded="menuOpen" :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'" @click="menuOpen=!menuOpen"><AppIcon name="menu"/></button>
        <form class="global-search" role="search" @submit.prevent="buscar"><AppIcon name="search" :size="19"/><input v-model="busqueda" aria-label="Buscar número" inputmode="numeric" placeholder="Buscar cartón... (ej. 00123)"/><button type="submit" aria-label="Buscar"><AppIcon name="arrow" :size="16"/></button></form>
        <div class="topbar-actions"><span class="mode-pill">DEMO</span><div class="user-avatar">{{ nombreUsuario.slice(0,1).toUpperCase() }}</div><div class="user-label"><strong>{{ nombreUsuario }}</strong><small>{{ auth.configurado ? 'Conectado' : 'Modo local' }}</small></div></div>
      </header>
      <main class="main-content"><slot/></main>
      <footer class="app-footer">Control de Bingo · Demostración académica · No procesa pagos reales</footer>
    </div>
  </div>
</template>
