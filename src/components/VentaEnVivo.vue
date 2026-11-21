<script setup>
import { ref } from 'vue'
import { supabase } from '@/infrastructure/supabase/supabaseClient'
import { MEDIOS_PAGO } from '@/domain/pagos/pago'
import { crearNumeroCarton } from '@/domain/cartones/numeroCarton'
import { validarNombreVenta } from '@/domain/pagos/nombreVenta'

const props = defineProps({ codigo: { type: String, required: true } })
const emit = defineEmits(['ocupado'])
const operador = ref('')
const clave = ref('')
const turno = ref('')
const numero = ref('')
const responsable = ref('')
const medio = ref('')
const error = ref('')
const mensaje = ref('')
const ocupado = ref(false)

function cambiarPersona() {
  turno.value = ''
  operador.value = ''
  clave.value = ''
  numero.value = ''
  responsable.value = ''
  medio.value = ''
  mensaje.value = ''
  error.value = ''
}
async function enviar() {
  if (ocupado.value) return
  ocupado.value = true
  emit('ocupado', true)
  mensaje.value = ''
  error.value = ''
  try {
    if (!turno.value) {
      const nombre = validarNombreVenta(operador.value)
      const respuesta = await supabase.rpc('iniciar_venta', {
        p_codigo: props.codigo, p_clave: clave.value.trim(), p_operador: nombre,
      })
      if (respuesta.error?.code === '42501') throw new Error('Comprueba la clave con el organizador y que la venta esté abierta.')
      if (respuesta.error || !respuesta.data) throw new Error('No se pudo iniciar el registro. Revisa tu conexión y vuelve a intentarlo.')
      operador.value = nombre
      turno.value = respuesta.data
      clave.value = ''
      return
    }

    const valor = numero.value.trim()
    if (!/^\d{1,5}$/.test(valor)) throw new Error('Ingresa un número de cartilla entre 00001 y 03000.')
    const cartilla = crearNumeroCarton(valor)
    const nombre = validarNombreVenta(responsable.value)
    if (!MEDIOS_PAGO.includes(medio.value)) throw new Error('Selecciona el medio de pago recibido.')
    const respuesta = await supabase.rpc('registrar_venta', {
      p_codigo: props.codigo, p_turno: turno.value, p_numero: Number(cartilla),
      p_responsable: nombre, p_medio: medio.value,
    })
    if (respuesta.error?.code === '23505') throw new Error('La cartilla ' + cartilla + ' ya está pagada.')
    if (respuesta.error?.code === '42501') {
      cambiarPersona()
      throw new Error('La venta se cerró o tu turno terminó. Consulta con el organizador.')
    }
    if (respuesta.error) throw new Error('No se pudo confirmar el registro. Consulta la cartilla antes de reintentar.')
    mensaje.value = 'Pago registrado para la cartilla ' + cartilla + '.'
    numero.value = ''
    responsable.value = ''
    medio.value = ''
  } catch (e) {
    error.value = e.message || 'No se pudo completar la operación.'
  } finally {
    ocupado.value = false
    emit('ocupado', false)
  }
}
</script>

<template>
  <form @submit.prevent="enviar">
    <fieldset :disabled="ocupado">
      <template v-if="!turno">
        <legend>¿Quién está llenando este formulario?</legend>
        <div class="field"><label for="operador-venta">Tu nombre y apellido</label>
          <input id="operador-venta" v-model="operador" maxlength="120" autocomplete="name" required />
        </div>
        <div class="field"><label for="clave-venta">Clave del equipo de ventas</label>
          <input id="clave-venta" v-model="clave" type="password" autocomplete="off" required />
        </div>
        <button class="primary-btn full-width">{{ ocupado ? 'Verificando…' : 'Continuar' }}</button>
      </template>
      <template v-else>
        <legend>Registrar pago recibido</legend>
        <p>Registra <strong>{{ operador }}</strong>. <button type="button" class="outline-btn button-sm" @click="cambiarPersona">Cambiar persona</button></p>
        <div class="field"><label for="numero-venta">Número de cartilla</label>
          <input id="numero-venta" v-model="numero" inputmode="numeric" maxlength="5" placeholder="Ej. 00123" required />
        </div>
        <div class="field"><label for="responsable-venta">Responsable del pago</label>
          <input id="responsable-venta" v-model="responsable" maxlength="120" required />
        </div>
        <div class="field"><label for="medio-venta">Medio de pago</label>
          <select id="medio-venta" v-model="medio" required>
            <option value="" disabled>Selecciona el medio</option>
            <option v-for="opcion in MEDIOS_PAGO" :key="opcion">{{ opcion }}</option>
          </select>
        </div>
        <button class="primary-btn full-width">{{ ocupado ? 'Registrando…' : 'Registrar pago' }}</button>
      </template>
    </fieldset>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="notice success" role="status">{{ mensaje }}</p>
  </form>
</template>

<style scoped>
form { margin-top: 1.5rem; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
legend { font-weight: 700; margin-bottom: 1rem; }
fieldset p { margin-bottom: 1rem; }
</style>
