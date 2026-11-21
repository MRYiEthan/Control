<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/infrastructure/supabase/supabaseClient'

const router = useRouter()
const enlace = ref('')
const mensaje = ref('')
const cargando = ref(false)

const ventaAbierta = ref(false)
const estadoConocido = ref(false)
const gestionando = ref(false)
const errorVenta = ref('')

async function administrar(accion) {
  gestionando.value = true
  errorVenta.value = ''
  try {
    const { data, error } = await supabase.rpc('gestionar_venta_por_enlace', { p_accion: accion })
    if (error) throw error
    ventaAbierta.value = data === true
    estadoConocido.value = true
  } catch {
    estadoConocido.value = false
    ventaAbierta.value = false
    errorVenta.value = 'No se pudo comprobar el estado de la venta.'
  } finally {
    gestionando.value = false
  }
}
onMounted(() => { if (supabase) administrar('estado') })

async function compartir() {
  cargando.value = true
  mensaje.value = ''
  try {
    if (!enlace.value) {
      const { data, error } = await supabase.rpc('obtener_enlace_invitado')
      if (error || !data) throw new Error()
      const ruta = router.resolve({ name: 'invitado', params: { codigo: data } })
      enlace.value = new URL(ruta.href, window.location.href).href
    }
    try {
      await navigator.clipboard.writeText(enlace.value)
      mensaje.value = 'Enlace copiado.'
    } catch {
      mensaje.value = 'Selecciona el enlace para copiarlo.'
    }
  } catch {
    mensaje.value = 'No se pudo obtener el enlace. Vuelve a intentarlo.'
  } finally {
    cargando.value = false
  }
}
</script>
<template>
  <section v-if="supabase" class="surface surface-pad compartir">
    <h2>Enlace de visita del bingo</h2>
    <p>Comparte este enlace para consultar cartillas. Mientras la venta esté abierta, cualquier persona con el enlace podrá registrar pagos después de indicar su nombre.</p>
    <button class="primary-btn" type="button" :disabled="cargando" @click="compartir">
      {{ cargando ? 'Obteniendo enlace…' : 'Copiar enlace de invitado' }}
    </button>
    <div v-if="enlace" class="field">
      <label for="enlace-invitado">Enlace de invitado</label>
      <input id="enlace-invitado" :value="enlace" readonly @focus="$event.target.select()" />
    </div>
    <p role="status">{{ mensaje }}</p>
    <hr />
    <h3>Venta en vivo</h3>
    <p v-if="errorVenta" role="alert">{{ errorVenta }}</p>
    <button v-if="!estadoConocido" class="outline-btn" :disabled="gestionando" @click="administrar('estado')">
      {{ gestionando ? 'Consultando…' : 'Consultar estado' }}
    </button>
    <template v-else-if="ventaAbierta">
      <p>Venta abierta.</p>
      <button class="outline-btn" :disabled="gestionando" @click="administrar('cerrar')">Cerrar venta</button>
    </template>
    <button v-else class="outline-btn" :disabled="gestionando" @click="administrar('abrir')">Abrir venta en vivo</button>
  </section>
</template>
<style scoped>
.compartir { margin-bottom: 1rem; }
.compartir p { margin: .65rem 0; }
.compartir p:empty { margin: 0; }
.compartir .field { margin: .85rem 0 0; }
</style>
