<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '@/infrastructure/supabase/supabaseClient'
import { MEDIOS_PAGO } from '@/domain/pagos/pago'
import { validarNombreVenta } from '@/domain/pagos/nombreVenta'
import { crearNumeroCarton } from '@/domain/cartones/numeroCarton'
import { cantidadCartillas, enSoles, listarNumeros } from '@/domain/pagos/precioCartilla'

const props = defineProps({ codigo: { type: String, required: true } })
const emit = defineEmits(['ocupado'])
const operador = ref('')
const turno = ref('')
const cantidad = ref('1')
const desde = ref('')
const hasta = ref('')
const siguiente = ref(null)
const ultimo = ref(null)
const editandoTalonario = ref(true)
const limite = computed(() => siguiente.value === null ? 0 : ultimo.value - siguiente.value + 1)
const precio = ref(null)
const medio = ref('')
const error = ref('')
const recibo = ref(null)
const ocupado = ref(false)
const pendiente = ref(null)
const cantidadValida = computed(() => cantidadCartillas(cantidad.value))
const total = computed(() => precio.value !== null && cantidadValida.value ? precio.value * cantidadValida.value : null)
const respaldo = 'bingo:venta-pendiente:' + props.codigo

function recordar(solicitud) {
  pendiente.value = solicitud
  try {
    if (solicitud) sessionStorage.setItem(respaldo, JSON.stringify({ operador: operador.value, ultimo: ultimo.value, solicitud }))
    else sessionStorage.removeItem(respaldo)
  } catch { /* El identificador también se conserva en memoria. */ }
}
function cambiarPersona() {
  turno.value = ''
  siguiente.value = null
  ultimo.value = null
  desde.value = ''
  hasta.value = ''
  editandoTalonario.value = true
  operador.value = ''
  precio.value = null
  cantidad.value = '1'
  medio.value = ''
  recibo.value = null
  error.value = ''
}

async function cargarPrecio() {
  const actual = turno.value
  if (!actual || pendiente.value) return
  const { data, error: fallo } = await supabase.rpc('precio_cartilla_turno', { p_codigo: props.codigo, p_turno: actual })
  if (turno.value !== actual || pendiente.value) return
  if (fallo) {
    precio.value = null
    error.value = 'No se pudo consultar el precio vigente.'
  } else if (!Number.isInteger(data)) {
    cambiarPersona()
    error.value = 'La venta se cerró o el turno terminó.'
  } else {
    if (precio.value !== null && precio.value !== data) error.value = 'Cambió el precio. Revisa el nuevo total antes de registrar.'
    precio.value = data
  }
}
function alVolver() { if (!document.hidden && !ocupado.value) cargarPrecio() }

onMounted(() => {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(respaldo))
    if (guardada?.solicitud?.p_codigo === props.codigo) {
      const s = guardada.solicitud
      pendiente.value = s
      turno.value = s.p_turno
      operador.value = guardada.operador
      siguiente.value = s.p_desde
      ultimo.value = guardada.ultimo
      editandoTalonario.value = false
      cantidad.value = String(s.p_cantidad)
      precio.value = s.p_precio
      medio.value = s.p_medio
      error.value = 'Hay una venta pendiente de confirmar. Pulsa Reintentar para recuperar el resultado.'
    }
  } catch { /* Sin una solicitud anterior. */ }
  document.addEventListener('visibilitychange', alVolver)
})
onUnmounted(() => document.removeEventListener('visibilitychange', alVolver))

async function iniciarTurno() {
  const nombre = validarNombreVenta(operador.value)
  const { data, error: fallo } = await supabase.rpc('iniciar_venta_por_enlace', { p_codigo: props.codigo, p_operador: nombre })
  if (fallo?.code === '42501') throw new Error('La venta está cerrada o el enlace no es válido.')
  if (fallo || !data) throw new Error('No se pudo iniciar el turno. Vuelve a intentarlo.')
  operador.value = nombre
  turno.value = data
  await cargarPrecio()
}
async function configurarTalonario() {
  const inicio = cantidadCartillas(desde.value.trim())
  const fin = cantidadCartillas(hasta.value.trim())
  if (inicio === null || fin === null || inicio > fin) throw new Error('Revisa el primer y el último número impresos, del 00001 al 03000.')
  const { error: fallo } = await supabase.rpc('usar_talonario', {
    p_codigo: props.codigo, p_turno: turno.value, p_desde: inicio, p_hasta: fin,
  })
  if (fallo?.code === '42501') {
    cambiarPersona()
    throw new Error('La venta está cerrada o el turno terminó.')
  }
  if (fallo) throw new Error('No se pudo confirmar el talonario. Vuelve a intentarlo.')
  siguiente.value = inicio
  ultimo.value = fin
  editandoTalonario.value = false
  cantidad.value = '1'
}
function cambiarTalonario() {
  desde.value = ''
  hasta.value = ''
  editandoTalonario.value = true
  error.value = ''
}
async function vender() {
  if (!pendiente.value) {
    if (!cantidadValida.value || precio.value === null) throw new Error('Revisa la cantidad y el precio.')
    if (cantidadValida.value > limite.value) throw new Error('La cantidad supera las cartillas restantes del talonario.')
    if (!MEDIOS_PAGO.includes(medio.value)) throw new Error('Selecciona el medio de pago recibido.')
    recordar({ p_codigo: props.codigo, p_turno: turno.value, p_solicitud: crypto.randomUUID(),
      p_desde: siguiente.value, p_cantidad: cantidadValida.value, p_precio: precio.value, p_medio: medio.value, p_responsable: operador.value })
  }
  const { data, error: fallo } = await supabase.rpc('vender_cartillas', pendiente.value)
  if (fallo?.code === '42501') {
    recordar(null)
    cambiarPersona()
    throw new Error('La venta está cerrada o tu turno terminó. Si hubo una interrupción, verifica el último registro con el administrador.')
  }
  if (fallo?.code === '22023') {
    recordar(null)
    throw new Error('Revisa los datos de la venta.')
  }
  if (fallo || !data) throw new Error('No se pudo confirmar el resultado. Pulsa Reintentar con los mismos datos.')
  if (data.estado === 'precio_cambio') {
    recordar(null)
    precio.value = data.precio
    throw new Error('El administrador cambió el precio. Revisa el nuevo total y confirma de nuevo.')
  }
  if (data.estado === 'cartilla_pagada') {
    recordar(null)
    const codigo = data.numero ? ' ' + crearNumeroCarton(data.numero) : ''
    throw new Error('La cartilla' + codigo + ' ya está pagada. No se registró el lote. Verifica tu numeración.')
  }
  if (data.estado === 'revisar_talonario') {
    recordar(null)
    cambiarTalonario()
    throw new Error('Verifica el próximo número físico y el último del talonario.')
  }
  if (data.estado !== 'registrada') throw new Error('Respuesta inesperada. Reintenta para verificar la venta.')
  recibo.value = data
  const proximo = data.numeros.at(-1) + 1
  siguiente.value = proximo <= ultimo.value ? proximo : null
  if (siguiente.value === null) cambiarTalonario()
  recordar(null)
  cantidad.value = '1'
  medio.value = ''
  await cargarPrecio()
}
async function enviar() {
  if (ocupado.value) return
  ocupado.value = true
  emit('ocupado', true)
  error.value = ''
  recibo.value = null
  try {
    if (!turno.value) await iniciarTurno()
    else if (editandoTalonario.value) await configurarTalonario()
    else await vender()
  } catch (e) { error.value = e.message || 'No se pudo completar la operación.' }
  finally {
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
        <button class="primary-btn full-width">{{ ocupado ? 'Verificando…' : 'Continuar' }}</button>
      </template>
      <template v-else-if="editandoTalonario">
        <legend>Tu talonario</legend>
        <p>Indica el próximo número impreso que entregarás y el último de ese bloque consecutivo.</p>
        <div class="field"><label for="inicio-venta">Próxima cartilla</label>
          <input id="inicio-venta" v-model="desde" inputmode="numeric" maxlength="5" placeholder="Ej. 00121" required />
        </div>
        <div class="field"><label for="fin-venta">Última cartilla del talonario</label>
          <input id="fin-venta" v-model="hasta" inputmode="numeric" maxlength="5" placeholder="Ej. 00150" required />
        </div>
        <button class="primary-btn full-width">Usar talonario</button>
        <button type="button" class="outline-btn" @click="cambiarPersona">Cambiar persona</button>
      </template>
      <template v-else>
        <legend>Registrar pago recibido</legend>
        <p>Registra <strong>{{ operador }}</strong>.
          <button type="button" class="outline-btn button-sm" :disabled="!!pendiente" @click="cambiarPersona">Cambiar persona</button>
        </p>
        <p>Talonario: <strong>{{ crearNumeroCarton(siguiente) }}–{{ crearNumeroCarton(ultimo) }}</strong>
          <button type="button" class="outline-btn button-sm" :disabled="!!pendiente" @click="cambiarTalonario">Cambiar numeración</button>
        </p>
        <div class="field"><label for="cantidad-venta">Cantidad de cartillas</label>
          <input id="cantidad-venta" v-model="cantidad" type="text" inputmode="numeric" pattern="[0-9]{1,4}" maxlength="4" :readonly="!!pendiente" required />
        </div>
        <p v-if="cantidadValida && cantidadValida <= limite">Para entregar: <strong>{{ crearNumeroCarton(siguiente) }}<template v-if="cantidadValida > 1">–{{ crearNumeroCarton(siguiente + cantidadValida - 1) }}</template></strong></p>
        <p v-else class="helper">Ingresa entre 1 y {{ limite }} cartillas.</p>
        <div class="result-line"><span>Precio por cartilla</span><strong>{{ precio !== null ? enSoles(precio) : 'Por consultar' }}</strong></div>
        <button v-if="precio === null" class="outline-btn" type="button" @click="cargarPrecio">Consultar precio</button>
        <div class="result-line" aria-live="polite"><span>Total a cobrar</span><strong>{{ total !== null ? enSoles(total) : '—' }}</strong></div>
        <div class="field"><label for="medio-venta">Medio de pago</label>
          <select id="medio-venta" v-model="medio" :disabled="!!pendiente" required>
            <option value="" disabled>Selecciona el medio</option>
            <option v-for="opcion in MEDIOS_PAGO" :key="opcion">{{ opcion }}</option>
          </select>
        </div>
        <button class="primary-btn full-width" :disabled="total === null || cantidadValida > limite">{{ ocupado ? 'Registrando…' : pendiente ? 'Reintentar' : 'Registrar pago' }}</button>
      </template>
    </fieldset>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <div v-if="recibo" class="notice success" role="status">
      <div><strong>Venta registrada · {{ enSoles(recibo.total) }}</strong>
        <p>Cartillas para entregar ({{ recibo.numeros.length }}): {{ listarNumeros(recibo.numeros) }}</p>
      </div>
    </div>
  </form>
</template>
<style scoped>
form { margin-top: 1.5rem; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
legend { font-weight: 700; margin-bottom: 1rem; }
fieldset p, .result-line { margin-bottom: 1rem; }
</style>
