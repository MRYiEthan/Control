<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  pagadas: { type: Number, required: true },
  total: { type: Number, required: true },
  cargando: Boolean,
  listo: Boolean,
  error: { type: String, default: '' },
})
const pendientes = computed(() => Math.max(0, props.total - props.pagadas))
const porcentaje = computed(() => props.total ? props.pagadas / props.total * 100 : 0)
const porcentajeTexto = computed(() => porcentaje.value.toLocaleString('es-PE', { maximumFractionDigits: 1 }))
const fondo = computed(() => ({
  background: 'conic-gradient(#148550 0% ' + porcentaje.value + '%, #f3b746 ' + porcentaje.value + '% 100%)',
}))
</script>

<template>
  <section class="surface surface-pad payment-summary" aria-labelledby="titulo-resumen-pagos" :aria-busy="cargando">
    <div class="surface-heading">
      <h2 id="titulo-resumen-pagos">Estado de pagos</h2>
      <RouterLink class="link-button" to="/pagos">Ver pagos</RouterLink>
    </div>
    <p v-if="cargando" role="status">Actualizando pagos…</p>
    <div v-else-if="error || !listo" class="notice error" role="alert">
      No se pudo consultar el resumen de pagos. Pulsa Actualizar para reintentar.
    </div>
    <div v-else class="payment-summary-body">
      <div class="payment-pie" :style="fondo" role="img"
        :aria-label="'Gráfico de pastel: ' + pagadas + ' cartillas pagadas y ' + pendientes + ' pendientes, de ' + total + '.'"></div>
      <div class="payment-summary-detail">
        <p class="payment-progress"><strong>{{ porcentajeTexto }}%</strong> del catálogo pagado</p>
        <dl class="payment-legend">
          <div><dt><span class="legend-dot paid"></span>Pagadas</dt><dd>{{ pagadas.toLocaleString('es-PE') }}</dd></div>
          <div><dt><span class="legend-dot pending"></span>Pendientes</dt><dd>{{ pendientes.toLocaleString('es-PE') }}</dd></div>
          <div><dt>Total de cartillas</dt><dd>{{ total.toLocaleString('es-PE') }}</dd></div>
        </dl>
        <p class="helper">Incluye todas las cartillas del catálogo, estén asignadas o no.</p>
      </div>
    </div>
  </section>
</template>
