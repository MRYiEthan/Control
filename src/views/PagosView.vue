<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { usePagosStore } from '@/stores/pagos'
import { useDistribucionStore } from '@/stores/distribucion'
import { useGruposStore } from '@/stores/grupos'
import { supabaseConfigurado } from '@/infrastructure/supabase/supabaseClient'
import { crearInventario, MEDIOS_PAGO } from '@/domain/pagos/pago'

const pagos = usePagosStore(), distribucion = useDistribucionStore(), grupos = useGruposStore()
const numero = ref(''), medio = ref('Efectivo'), busqueda = ref(''), estado = ref('')
const error = ref(''), mensaje = ref(''), cargando = ref(false), guardando = ref(false)
const responsable = ref(''), editando = ref(null)
const pagina = ref(1), porPagina = 50
const inventario = computed(() => crearInventario(pagos.pagos, distribucion.asignaciones, grupos.grupos))
const seleccionada = computed(() => inventario.value.find(c => c.numero === Number(numero.value)))
const visibles = computed(() => inventario.value.filter(c =>
  (!estado.value || c.estado === estado.value) &&
  (!busqueda.value.trim() || c.codigo.includes(busqueda.value.trim()) ||
    c.grupo.toLocaleLowerCase('es').includes(busqueda.value.trim().toLocaleLowerCase('es')) ||
    (c.pago?.responsable || '').toLocaleLowerCase('es').includes(busqueda.value.trim().toLocaleLowerCase('es')))
))
const paginas = computed(() => Math.max(1, Math.ceil(visibles.value.length / porPagina)))
const filas = computed(() => visibles.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina))
const bloqueado = computed(() => cargando.value || guardando.value || !pagos.listo)
watch([busqueda, estado], () => { pagina.value = 1 })
watch(paginas, total => { pagina.value = Math.min(pagina.value, total) })
const fecha = value => value ? new Date(value).toLocaleString('es-PE') : '—'

async function cargar() {
  if (guardando.value) return
  cargando.value = true
  error.value = ''
  try { await Promise.all([pagos.cargar(), distribucion.cargar(), grupos.cargar()]) }
  catch (e) { error.value = e.message }
  finally { cargando.value = false }
}
async function registrar() {
  if (bloqueado.value) return
  error.value = ''; mensaje.value = ''; guardando.value = true
  try {
    const datos = { numero: numero.value, medio: medio.value, responsable: responsable.value }
    const esEdicion = editando.value !== null
    const pago = esEdicion ? await pagos.editar(editando.value, datos) : await pagos.registrar(datos)
    mensaje.value = 'Cartilla #' + String(pago.numero).padStart(5, '0') + (esEdicion ? ': pago corregido.' : ' marcada como Pagada.')
    cancelarEdicion()
  } catch (e) { error.value = e.message }
  finally { guardando.value = false }
}
function cancelarEdicion() {
  editando.value = null
  numero.value = ''
  responsable.value = ''
  medio.value = 'Efectivo'
}
function editar(cartilla) {
  editando.value = cartilla.numero
  numero.value = cartilla.codigo
  medio.value = cartilla.pago.medio
  responsable.value = cartilla.pago.responsable || ''
  error.value = ''; mensaje.value = ''
  document.getElementById('responsable-pago')?.focus()
}
async function devolverPendiente(cartilla) {
  if (bloqueado.value) return
  if (!window.confirm('¿Eliminar el registro de pago de la cartilla #' + cartilla.codigo + ' y devolverla a Pendiente?')) return
  guardando.value = true; error.value = ''; mensaje.value = ''
  try {
    await pagos.devolverPendiente(cartilla.numero)
    if (editando.value === cartilla.numero) cancelarEdicion()
    mensaje.value = 'Cartilla #' + cartilla.codigo + ' devuelta a Pendiente.'
  } catch (e) { error.value = e.message }
  finally { guardando.value = false }
}
function seleccionar(cartilla) {
  cancelarEdicion()
  numero.value = cartilla.codigo
  mensaje.value = ''
  document.getElementById('numero-pago')?.focus()
}
onMounted(cargar)
</script>

<template>
  <div class="page-header">
    <div><h1>Control de pagos</h1><p>Consulta y registra el pago de cada cartilla.</p></div>
    <button class="outline-btn" :disabled="cargando || guardando" @click="cargar">Actualizar</button>
  </div>
  <div v-if="!supabaseConfigurado" class="notice">
    <AppIcon name="info" :size="19" />
    <div><strong>Modo local</strong><p>Los registros se guardan solamente en este navegador.</p></div>
  </div>
  <div v-if="error" class="notice error" role="alert">{{ error }}</div>
  <div v-if="mensaje" class="notice success" role="status">{{ mensaje }}</div>
  <div class="stats-grid payment-stats">
    <div class="surface metric-card"><div class="metric-icon blue"><AppIcon name="ticket" /></div><div><div class="metric-title">Total de cartillas</div><div class="metric-value">3,000</div></div></div>
    <div class="surface metric-card"><div class="metric-icon green"><AppIcon name="check" /></div><div><div class="metric-title">Pagadas</div><div class="metric-value">{{ pagos.listo ? pagos.pagos.length : '—' }}</div></div></div>
    <div class="surface metric-card"><div class="metric-icon amber"><AppIcon name="clock" /></div><div><div class="metric-title">Pendientes</div><div class="metric-value">{{ pagos.listo ? 3000 - pagos.pagos.length : '—' }}</div></div></div>
  </div>
  <section class="surface surface-pad">
    <div class="surface-heading"><h2>{{ editando !== null ? 'Editar pago de #' + String(editando).padStart(5, '0') : 'Registrar pago' }}</h2></div>
    <form @submit.prevent="registrar">
      <div class="form-row">
        <div class="field"><label for="numero-pago">Número de cartilla</label><input id="numero-pago" v-model="numero" required inputmode="numeric" pattern="[0-9]{1,5}" maxlength="5" placeholder="Ej. 00123" :disabled="bloqueado" /></div>
        <div class="field"><label for="medio-pago">Medio de pago</label><select id="medio-pago" v-model="medio" :disabled="bloqueado"><option v-for="opcion in MEDIOS_PAGO" :key="opcion">{{ opcion }}</option></select></div>
      </div>
      <div class="field"><label for="responsable-pago">Responsable del pago *</label><input id="responsable-pago" v-model="responsable" required maxlength="120" placeholder="Nombre y apellido de la persona responsable" :disabled="bloqueado" /></div>
      <p v-if="editando !== null" class="helper">Puedes corregir la cartilla, el medio y el responsable. Si cambias el número, la cartilla anterior quedará pendiente.</p>
      <p v-if="seleccionada && pagos.listo" class="helper">
        #{{ seleccionada.codigo }} · {{ seleccionada.grupo }} ·
        <span class="status" :class="seleccionada.pago ? 'green' : 'amber'">{{ seleccionada.estado }}</span>
      </p>
      <button class="primary-btn" type="submit" :disabled="bloqueado || !seleccionada || !responsable.trim() || (!!seleccionada.pago && seleccionada.numero !== editando)">
        {{ guardando ? 'Guardando…' : editando !== null ? 'Guardar cambios' : seleccionada?.pago ? 'Esta cartilla ya está pagada' : 'Marcar como pagada' }}
      </button>
      <button v-if="editando !== null" class="outline-btn" type="button" :disabled="guardando" @click="cancelarEdicion">Cancelar edición</button>
      <p class="helper payment-help">Registra el pago después de confirmar que lo recibiste.</p>
    </form>
  </section>
  <section class="surface surface-pad payment-inventory">
    <div class="surface-heading"><h2>Inventario de cartillas</h2><span v-if="pagos.listo" class="helper">{{ visibles.length }} resultados</span></div>
    <div class="filters-row">
      <div class="field"><label for="buscar-pago">Buscar número, grupo o responsable</label><input id="buscar-pago" v-model="busqueda" placeholder="Ej. 00123 o Catequesis" /></div>
      <div class="field"><label for="estado-pago">Estado del pago</label><select id="estado-pago" v-model="estado"><option value="">Todos</option><option>Pagada</option><option>Pendiente</option></select></div>
    </div>
    <p v-if="cargando" role="status">Cargando inventario…</p>
    <div v-else-if="!pagos.listo" class="empty-state">No se pudo consultar el estado de los pagos. Pulsa Actualizar para reintentar.</div>
    <template v-else>
      <div class="table-scroll"><table class="responsive-table">
        <thead><tr><th>Cartilla</th><th>Grupo actual</th><th>Estado</th><th>Medio</th><th>Responsable del pago</th><th>Fecha de registro</th><th>Acción</th></tr></thead>
        <tbody><tr v-for="cartilla in filas" :key="cartilla.numero">
          <td data-label="Cartilla"><strong>#{{ cartilla.codigo }}</strong></td><td data-label="Grupo actual">{{ cartilla.grupo }}</td>
          <td data-label="Estado"><span class="status" :class="cartilla.pago ? 'green' : 'amber'">{{ cartilla.estado }}</span></td>
          <td data-label="Medio">{{ cartilla.pago?.medio || '—' }}</td><td data-label="Responsable del pago">{{ cartilla.pago ? (cartilla.pago.responsable || 'Sin registrar') : '—' }}</td><td data-label="Fecha de registro">{{ fecha(cartilla.pago?.created_at) }}</td>
          <td data-label="Acción"><button v-if="!cartilla.pago" class="outline-btn button-sm" :disabled="bloqueado" @click="seleccionar(cartilla)">Registrar pago</button><div v-else class="table-actions"><button class="outline-btn button-sm" :disabled="bloqueado" @click="editar(cartilla)">Editar</button><button class="danger-btn button-sm" :disabled="bloqueado" @click="devolverPendiente(cartilla)">Devolver a pendiente</button></div></td>
        </tr></tbody>
      </table></div>
      <div v-if="!filas.length" class="empty-state">No hay cartillas que coincidan con los filtros.</div>
      <nav class="payment-pagination" aria-label="Páginas del inventario">
        <button class="outline-btn button-sm" :disabled="pagina === 1" @click="pagina--">Anterior</button>
        <span class="helper">Página {{ pagina }} de {{ paginas }}</span>
        <button class="outline-btn button-sm" :disabled="pagina === paginas" @click="pagina++">Siguiente</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.payment-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.payment-inventory { margin-top: 20px; }
.payment-help { margin: 12px 0 0; }
.payment-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; }
@media (max-width: 640px) { .payment-stats { grid-template-columns: 1fr; } }
</style>
