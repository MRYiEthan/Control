import test from 'node:test'
import assert from 'node:assert/strict'
import { leerPrecio, cantidadCartillas, listarNumeros } from '../src/domain/pagos/precioCartilla.js'

test('calcula importes y descuentos en céntimos', () => {
  assert.equal(leerPrecio('10') * cantidadCartillas('3'), 3000)
  assert.equal(leerPrecio('7,50') * cantidadCartillas('3'), 2250)
  assert.equal(leerPrecio('0.01'), 1)
  for (const valor of ['', '0', '-1', '7.555', '1e3']) assert.throws(() => leerPrecio(valor))
  for (const n of [0, 3001, '1.5', '']) assert.equal(cantidadCartillas(n), null)
})
test('presenta rangos y huecos de las cartillas asignadas', () => {
  assert.equal(listarNumeros([2, 3, 4, 7, 10, 11]), '00002–00004, 00007, 00010–00011')
})
