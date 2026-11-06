import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { crearInventario, numerosDelRango, MEDIOS_PAGO } from '../src/domain/pagos/pago.js'

// Ejecuta las acciones del formulario sin requerir navegador ni dependencias Vue.
function formulario() {
  const llamadas = []
  const pagos = {
    listo: true, pagos: [],
    registrar: async datos => { llamadas.push(['unidad', datos]); return { numero: Number(datos.numero) } },
    registrarRango: async datos => { llamadas.push(['bloque', datos]); return numerosDelRango(datos.desde, datos.hasta).map(numero => ({ numero })) },
    editar: async (origen, datos) => { llamadas.push(['editar', origen, datos]); return { numero: Number(datos.numero) } },
  }
  const contexto = vm.createContext({
    ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
    watch: () => {}, onMounted: () => {}, crearInventario, numerosDelRango, MEDIOS_PAGO,
    usePagosStore: () => pagos, useDistribucionStore: () => ({ asignaciones: [] }),
    useGruposStore: () => ({ grupos: [] }), document: { getElementById: () => null },
  })
  const archivo = readFileSync(new URL('../src/views/PagosView.vue', import.meta.url), 'utf8')
  const script = archivo.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
  const ui = vm.runInContext(script + '\n;({ tipoPago, numero, hasta, responsable, esBloque, puedeGuardar, registrar, seleccionar, editar, mensaje })', contexto)
  return { ui, llamadas, pagos }
}

test('venta por unidad es predeterminada y no necesita Hasta', async () => {
  const { ui, llamadas } = formulario()
  assert.equal(ui.tipoPago.value, 'unidad')
  ui.numero.value = '00010'; ui.responsable.value = 'Ana'
  assert.equal(ui.puedeGuardar.value, true)
  await ui.registrar()
  assert.equal(llamadas[0][0], 'unidad')
  assert.match(ui.mensaje.value, /00010.*pagada/)
})

test('modo bloque exige un rango y registra todos sus números', async () => {
  const { ui, llamadas } = formulario()
  ui.tipoPago.value = 'bloque'; ui.numero.value = '00010'; ui.responsable.value = 'Grupo Coro'
  assert.equal(ui.puedeGuardar.value, false)
  ui.hasta.value = '00025'
  assert.equal(ui.puedeGuardar.value, true)
  await ui.registrar()
  assert.equal(llamadas[0][0], 'bloque')
  assert.equal(llamadas[0][1].hasta, '00025')
  assert.match(ui.mensaje.value, /16 cartillas/)
})

test('volver a unidad ignora un Hasta previo y seleccionar inventario activa unidad', async () => {
  const { ui, llamadas } = formulario()
  ui.tipoPago.value = 'bloque'; ui.hasta.value = '00025'
  ui.tipoPago.value = 'unidad'; ui.numero.value = '00010'; ui.responsable.value = 'Ana'
  await ui.registrar()
  assert.equal(llamadas[0][0], 'unidad')
  ui.tipoPago.value = 'bloque'
  ui.seleccionar({ codigo: '00030' })
  assert.equal(ui.tipoPago.value, 'unidad')
  assert.equal(ui.numero.value, '00030')
})

test('ambos modos bloquean duplicados y editar sigue siendo individual', async () => {
  const { ui, pagos, llamadas } = formulario()
  pagos.pagos = [{ numero: 10, medio: 'Yape', responsable: 'Ana' }]
  ui.numero.value = '00010'
  assert.equal(ui.puedeGuardar.value, false)
  ui.tipoPago.value = 'bloque'; ui.hasta.value = '00025'
  assert.equal(ui.puedeGuardar.value, false)
  ui.editar({ numero: 10, codigo: '00010', pago: pagos.pagos[0] })
  assert.equal(ui.esBloque.value, false)
  assert.equal(ui.puedeGuardar.value, true)
  await ui.registrar()
  assert.equal(llamadas[0][0], 'editar')
})
