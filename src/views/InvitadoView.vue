<script setup>
import { computed, ref } from 'vue'
import VentaEnVivo from '@/components/VentaEnVivo.vue'
import AppIcon from '@/components/AppIcon.vue'
import { crearNumeroCarton } from '@/domain/cartones/numeroCarton'
import { supabase } from '@/infrastructure/supabase/supabaseClient'

const props = defineProps({ codigo: { type: String, default: '' } })
const enlaceValido = computed(() => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(props.codigo))
const modo = ref('consulta')
const ventaOcupada = ref(false)
const numero = ref('')
const resultado = ref(null)
const error = ref('')
const cargando = ref(false)

async function consultar() {
  if (cargando.value) return
  error.value = ''
  resultado.value = null
  let cartilla
  try {
    const valor = numero.value.trim()
    if (!/^\d{1,5}$/.test(valor)) throw new Error()
    cartilla = crearNumeroCarton(valor)
  } catch {
    error.value = 'Ingresa un número entre 00001 y 03000.'
    return
  }
  cargando.value = true
  try {
    const { data, error: fallo } = await supabase.rpc('consultar_pago_invitado', {
      p_codigo: props.codigo,
      p_numero: Number(cartilla),
    })
    if (fallo) throw fallo
    if (typeof data !== 'boolean') {
      error.value = 'El enlace es inválido. Solicita el enlace al organizador.'
      return
    }
    resultado.value = { cartilla, pagada: data }
  } catch {
    error.value = 'No se pudo verificar el pago. Vuelve a intentarlo.'
  } finally {
    cargando.value = false
  }
}
</script>
<template>
  <main class="invitado">
    <section class="surface surface-pad consulta">
      <div class="surface-heading"><AppIcon name="ticket" /><span>Control de Bingo</span></div>
      <h1>Cartillas del bingo</h1>
      <p v-if="!enlaceValido" class="notice" role="alert">Abre el enlace de invitado que te compartió el organizador.</p>
      <p v-else-if="!supabase" class="notice" role="alert">La consulta de invitados no está disponible en esta demostración.</p>
      <template v-else>
        <div class="segmented opciones" role="group" aria-label="Acción sobre la cartilla">
          <button type="button" :disabled="cargando || ventaOcupada" :aria-pressed="modo === 'consulta'" :class="{active: modo === 'consulta'}" @click="modo = 'consulta'">Consultar cartón</button>
          <button type="button" :disabled="cargando || ventaOcupada" :aria-pressed="modo === 'venta'" :class="{active: modo === 'venta'}" @click="modo = 'venta'; resultado = null; error = ''">Pagar cartón</button>
        </div>
        <VentaEnVivo v-if="modo === 'venta'" :codigo="props.codigo" @ocupado="ventaOcupada = $event" />
        <template v-else>
        <form @submit.prevent="consultar">
          <div class="field">
            <label for="cartilla">Número de cartilla</label>
            <input id="cartilla" v-model="numero" inputmode="numeric" maxlength="5"
              placeholder="Ej. 00123" autocomplete="off" :readonly="cargando"
              @input="resultado = null; error = ''" />
          </div>
          <button class="primary-btn full-width" :disabled="cargando">
            {{ cargando ? 'Consultando…' : 'Verificar pago' }}
          </button>
        </form>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <div aria-live="polite">
          <div v-if="resultado" class="result-line">
            <strong>Cartilla {{ resultado.cartilla }}</strong>
            <span class="status" :class="resultado.pagada ? 'green' : 'amber'">
              {{ resultado.pagada ? 'Pagada' : 'Pendiente' }}
            </span>
          </div>
        </div>
        </template>
      </template>
    </section>
  </main>
</template>
<style scoped>
.invitado { min-height: 100vh; display: grid; place-items: center; padding: 1rem; }
.consulta { width: 100%; max-width: 28rem; }
.consulta h1 { font-size: clamp(1.55rem, 5vw, 2rem); }
.opciones { margin-top: 1rem; }
.consulta form, .consulta .result-line { margin-top: 1.5rem; }
</style>
