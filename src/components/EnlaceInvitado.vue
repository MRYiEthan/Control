<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/infrastructure/supabase/supabaseClient'

const router = useRouter()
const enlace = ref('')
const mensaje = ref('')
const cargando = ref(false)

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
    <h2>Consulta para invitados</h2>
    <p>Comparte este enlace para que puedan verificar el pago de una cartilla sin iniciar sesión.</p>
    <button class="primary-btn" type="button" :disabled="cargando" @click="compartir">
      {{ cargando ? 'Obteniendo enlace…' : 'Copiar enlace de invitado' }}
    </button>
    <div v-if="enlace" class="field">
      <label for="enlace-invitado">Enlace de invitado</label>
      <input id="enlace-invitado" :value="enlace" readonly @focus="$event.target.select()" />
    </div>
    <p role="status">{{ mensaje }}</p>
  </section>
</template>
<style scoped>
.compartir { margin-bottom: 1rem; }
.compartir p { margin: .65rem 0; }
.compartir p:empty { margin: 0; }
.compartir .field { margin: .85rem 0 0; }
</style>
