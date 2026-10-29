import test from 'node:test'
import assert from 'node:assert/strict'
import { crearPago, crearInventario } from '../src/domain/pagos/pago.js'
import { crearGestorPagos } from '../src/application/pagos/gestionarPagos.js'
import { crearPagosRepository } from '../src/infrastructure/pagos/crearPagosRepository.js'

function almacenamiento() {
  const datos = new Map()
  return { getItem: key => datos.get(key) ?? null, setItem: (key, value) => datos.set(key, value) }
}
test('catálogo completo, estado y asignación independientes', () => {
  const filas = crearInventario([{ numero: 123 }], [{ inicio: 120, fin: 130, grupoId: 'g' }], [{ id: 'g', nombre: 'Coro' }])
  assert.equal(filas.length, 3000)
  assert.equal(filas[122].estado, 'Pagada')
  assert.equal(filas[122].grupo, 'Coro')
  assert.equal(filas[123].estado, 'Pendiente')
  assert.equal(filas[2999].codigo, '03000')
  assert.equal(crearInventario([{ numero: 123 }])[122].estado, 'Pagada')
})
test('valida límites, entrada numérica y medio', () => {
  for (const numero of ['', 0, 3001, -1, '1e2', '1.5', 'abc']) {
    assert.throws(() => crearPago({ numero, responsable: 'Ana Pérez', medio: 'Efectivo' }))
  }
  assert.throws(() => crearPago({ numero: 1, responsable: 'Ana Pérez', medio: 'Otro' }))
  assert.equal(crearPago({ numero: '00001', responsable: 'Ana Pérez', medio: 'Yape' }).numero, 1)
  assert.equal(crearPago({ numero: '03000', responsable: 'Ana Pérez', medio: 'Plin' }).numero, 3000)
})
test('registra, recarga y rechaza duplicados incluso con ceros iniciales', async () => {
  const storage = almacenamiento()
  const gestor = crearGestorPagos(crearPagosRepository({ storage }))
  await gestor.registrar({ numero: '00123', responsable: 'Ana Pérez', medio: 'Efectivo' })
  const recargado = crearPagosRepository({ storage })
  assert.equal((await recargado.listar())[0].numero, 123)
  await assert.rejects(gestor.registrar({ numero: 123, responsable: 'Ana Pérez', medio: 'Yape' }), /ya está pagada/)
  assert.equal((await recargado.listar()).length, 1)
})
test('el repositorio también bloquea duplicados', async () => {
  const repo = crearPagosRepository({ storage: almacenamiento() })
  await repo.crear({ numero: 1 })
  await assert.rejects(repo.crear({ numero: 1 }), /ya está pagada/)
})
test('un almacenamiento corrupto no se transforma en inventario pendiente', async () => {
  const repo = crearPagosRepository({ storage: { getItem: () => '{mal' } })
  await assert.rejects(repo.listar())
})
test('un fallo de escritura se propaga sin comunicar éxito', async () => {
  const repo = crearPagosRepository({ storage: { getItem: () => null, setItem: () => { throw new Error('Sin espacio') } } })
  await assert.rejects(repo.crear({ numero: 1 }), /Sin espacio/)
})
test('recupera pagos más allá del límite de 1000 filas', async () => {
  const filas = Array.from({ length: 1250 }, (_, i) => ({ numero: i + 1 }))
  const rangos = []
  const cliente = { from: () => ({ select: () => ({ order: () => ({
    range: async (desde, hasta) => { rangos.push(desde); return { data: filas.slice(desde, hasta + 1) } },
  }) }) }) }
  const pagos = await crearPagosRepository({ cliente }).listar()
  assert.equal(pagos.length, 1250)
  assert.deepEqual(rangos, [0, 500, 1000])
})
test('un fallo remoto no cae silenciosamente al modo local', async () => {
  const cliente = { from: () => ({ select: () => ({ order: () => ({
    range: async () => ({ error: { message: 'Sin permisos' } }),
  }) }) }) }
  await assert.rejects(crearPagosRepository({ cliente }).listar(), /Sin permisos/)
})
test('la restricción remota comunica un pago concurrente duplicado', async () => {
  const cliente = { from: () => ({ insert: () => ({ select: () => ({
    single: async () => ({ error: { code: '23505' } }),
  }) }) }) }
  await assert.rejects(crearPagosRepository({ cliente }).crear({ numero: 1, responsable: 'Ana Pérez', medio: 'Yape' }), /ya está pagada/)
})

test('exige responsable y normaliza espacios', () => {
  for (const responsable of ['', '   ', 'a'.repeat(121)]) {
    assert.throws(() => crearPago({ numero: 1, medio: 'Yape', responsable }), /responsable/)
  }
  assert.equal(crearPago({ numero: 1, medio: 'Yape', responsable: ' Ana Pérez ' }).responsable, 'Ana Pérez')
})
test('edita datos, traslada la cartilla y conserva fecha de registro al recargar', async () => {
  const storage = almacenamiento(), repo = crearPagosRepository({ storage })
  const gestor = crearGestorPagos(repo)
  const original = await gestor.registrar({ numero: 1, medio: 'Yape', responsable: 'Ana' })
  await gestor.editar(1, { numero: 2, medio: 'Plin', responsable: 'Luis' })
  const datos = await crearPagosRepository({ storage }).listar()
  assert.equal(datos.length, 1)
  assert.equal(datos[0].numero, 2)
  assert.equal(datos[0].responsable, 'Luis')
  assert.equal(datos[0].medio, 'Plin')
  assert.equal(datos[0].created_at, original.created_at)
  const inventario = crearInventario(datos)
  assert.equal(inventario[0].estado, 'Pendiente')
  assert.equal(inventario[1].estado, 'Pagada')
})
test('rechaza traslado a cartilla pagada sin perder el pago original', async () => {
  const repo = crearPagosRepository({ storage: almacenamiento() })
  const gestor = crearGestorPagos(repo)
  await gestor.registrar({ numero: 1, medio: 'Yape', responsable: 'Ana' })
  await gestor.registrar({ numero: 2, medio: 'Plin', responsable: 'Luis' })
  await assert.rejects(gestor.editar(1, { numero: 2, medio: 'Yape', responsable: 'Ana' }), /pagada/)
  assert.equal((await repo.listar()).length, 2)
})
test('completa el responsable de un registro antiguo sin cambiar su fecha', async () => {
  const repo = crearPagosRepository({ storage: almacenamiento() })
  await repo.crear({ numero: 1, medio: 'Efectivo', created_at: '2026-01-01' })
  const resultado = await crearGestorPagos(repo).editar(1, { numero: 1, medio: 'Efectivo', responsable: 'Ana' })
  assert.equal(resultado.responsable, 'Ana')
  assert.equal(resultado.created_at, '2026-01-01')
})
test('devolver a pendiente persiste y permite registrar una corrección', async () => {
  const storage = almacenamiento(), repo = crearPagosRepository({ storage })
  const gestor = crearGestorPagos(repo)
  await gestor.registrar({ numero: 1, medio: 'Yape', responsable: 'Ana' })
  await gestor.devolverPendiente(1)
  assert.deepEqual(await crearPagosRepository({ storage }).listar(), [])
  await gestor.registrar({ numero: 1, medio: 'Efectivo', responsable: 'Luis' })
  assert.equal((await repo.listar())[0].responsable, 'Luis')
})
test('editar o eliminar un pago inexistente no comunica éxito', async () => {
  const repo = crearPagosRepository({ storage: almacenamiento() })
  await assert.rejects(repo.editar(1, { numero: 2 }), /no encontrado/)
  await assert.rejects(repo.eliminar(1), /no encontrado/)
})
test('update remoto filtra por origen y detecta ausencia o permisos', async () => {
  let filtro, cambios
  const cliente = { from: () => ({ update: datos => {
    cambios = datos
    return { eq: (campo, numero) => {
      filtro = [campo, numero]
      return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
    } }
  } }) }
  await assert.rejects(crearPagosRepository({ cliente }).editar(1, { numero: 2, medio: 'Yape', responsable: 'Ana' }), /sin permisos/)
  assert.deepEqual(filtro, ['numero', 1])
  assert.deepEqual(cambios, { numero: 2, medio: 'Yape', responsable: 'Ana' })
})
test('delete remoto filtra la cartilla y propaga errores', async () => {
  let filtro
  const cliente = { from: () => ({ delete: () => ({ eq: (campo, numero) => {
    filtro = [campo, numero]
    return { select: () => ({ maybeSingle: async () => ({ error: { message: 'Sin permisos' } }) }) }
  } }) }) }
  await assert.rejects(crearPagosRepository({ cliente }).eliminar(1), /Sin permisos/)
  assert.deepEqual(filtro, ['numero', 1])
})
