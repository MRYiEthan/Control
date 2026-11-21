<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '@/infrastructure/supabase/supabaseClient'
import { enSoles, leerPrecio } from '@/domain/pagos/precioCartilla'

const vigente = ref(null)
const importe = ref('')
const ocupado = ref(false)
const error = ref('')
const mensaje = ref('')

async function gestionar(guardar = false) {
  if (ocupado.value) return
  ocupado.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const centimos = guardar ? leerPrecio(importe.value) : null
    const { data, error: fallo } = await supabase.rpc('precio_cartilla_admin', { p_precio: centimos })
    if (fallo || !Number.isInteger(data)) throw new Error('No se pudo comprobar el precio. Vuelve a intentarlo.')
    vigente.value = data
    importe.value = (data / 100).toFixed(2)
    if (guardar) mensaje.value = 'Precio actualizado para las próximas ventas.'
  } catch (e) { error.value = e.message }
  finally { ocupado.value = false }
}
onMounted(() => gestionar())
</script>
<template>
  <section class="surface surface-pad precio-cartilla">
    <div class="surface-heading"><h2>Precio de la cartilla</h2></div>
    <p v-if="vigente !== null">Precio vigente: <strong>{{ enSoles(vigente) }}</strong></p>
    <form v-if="vigente !== null" @submit.prevent="gestionar(true)">
      <div class="field"><label for="precio-cartilla">Nuevo precio por cartilla (S/)</label>
        <input id="precio-cartilla" v-model="importe" inputmode="decimal" required :disabled="ocupado" />
      </div>
      <button class="outline-btn" :disabled="ocupado">Guardar precio</button>
    </form>
    <button v-else class="outline-btn" :disabled="ocupado" @click="gestionar()">{{ ocupado ? 'Consultando…' : 'Consultar precio' }}</button>
    <p v-if="error" role="alert" class="notice error">{{ error }}</p>
    <p v-if="mensaje" role="status" class="notice success">{{ mensaje }}</p>
  </section>
</template>
<style scoped>
.precio-cartilla { margin-bottom: 1rem; }
form { margin-top: .75rem; }
.field { max-width: 17rem; }
</style>
