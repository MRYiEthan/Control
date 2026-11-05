import test from 'node:test'
import assert from 'node:assert/strict'
import { crearPagosRango, numerosDelRango } from '../src/domain/pagos/pago.js'
import { crearGestorPagos } from '../src/application/pagos/gestionarPagos.js'
import { crearPagosRepository } from '../src/infrastructure/pagos/crearPagosRepository.js'

const datos = { desde: '00010', hasta: '00025', medio: 'Yape', responsable: ' Ana ' }
function almacenamiento() {
  let contenido = null
  return { getItem: () => contenido, setItem: (_, valor) => { contenido = valor } }
}

test('rango inclusivo comparte responsable, medio y fecha', () => {
  const lote = crearPagosRango(datos)
  assert.equal(lote.length, 16)
  assert.equal(lote[0].numero, 10)
  assert.equal(lote.at(-1).numero, 25)
  assert.ok(lote.every(p => p.responsable === 'Ana' && p.medio === 'Yape' && p.created_at === lote[0].created_at))
  assert.deepEqual(numerosDelRango('03000', '03000'), [3000])
  assert.equal(numerosDelRango(1, 3000).length, 3000)
})

test('rechaza rangos incompletos, invertidos, inválidos y datos obligatorios', () => {
  for (const [desde, hasta] of [['', 20], [1, ''], [26, 25], [0, 1], [1, 3001], ['1e2', 200], [1, '2.5']]) {
    assert.throws(() => crearPagosRango({ ...datos, desde, hasta }))
  }
  assert.throws(() => crearPagosRango({ ...datos, responsable: ' ' }))
  assert.throws(() => crearPagosRango({ ...datos, medio: 'Otro' }))
})

test('persiste todo el rango y bloquea superposiciones sin pagos parciales', async () => {
  const storage = almacenamiento()
  const gestor = crearGestorPagos(crearPagosRepository({ storage }))
  await gestor.registrarRango(datos)
  await assert.rejects(gestor.registrarRango({ ...datos, desde: 1, hasta: 15 }), /00010.*pagada/)
  const pagos = await crearPagosRepository({ storage }).listar()
  assert.deepEqual(pagos.map(p => p.numero), numerosDelRango(10, 25))
})

test('repositorio revalida conflictos antes de una única escritura local', async () => {
  const repo = crearPagosRepository({ storage: almacenamiento() })
  await repo.crear({ numero: 25 })
  await assert.rejects(repo.crearLote(crearPagosRango(datos)), /ya está pagada/)
  assert.deepEqual(await repo.listar(), [{ numero: 25 }])
})

test('envía 3000 cartillas en una sola inserción remota sin respuesta truncada', async () => {
  const llamadas = []
  const cliente = { from: tabla => ({ insert: async filas => { llamadas.push({ tabla, filas }); return { error: null } } }) }
  const lote = crearPagosRango({ ...datos, desde: 1, hasta: 3000 })
  const resultado = await crearPagosRepository({ cliente }).crearLote(lote)
  assert.equal(llamadas.length, 1)
  assert.equal(llamadas[0].tabla, 'pagos_cartillas')
  assert.equal(llamadas[0].filas.length, 3000)
  assert.deepEqual(llamadas[0].filas[0], { numero: 1, medio: 'Yape', responsable: 'Ana' })
  assert.equal(resultado.length, 3000)
})

test('propaga duplicados concurrentes y otros errores remotos sin usar almacenamiento local', async () => {
  for (const error of [{ code: '23505' }, { message: 'Sin permisos' }]) {
    const cliente = { from: () => ({ insert: async () => ({ error }) }) }
    const storage = { setItem: () => assert.fail('No debe escribir en local') }
    await assert.rejects(crearPagosRepository({ cliente, storage }).crearLote(crearPagosRango(datos)), /No se registró el rango|Sin permisos/)
  }
})

test('un fallo al guardar el rango no comunica éxito', async () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('Sin espacio') } }
  await assert.rejects(crearGestorPagos(crearPagosRepository({ storage })).registrarRango(datos), /Sin espacio/)
})
