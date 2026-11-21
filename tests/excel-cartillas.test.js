import test from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8, unzipSync } from 'fflate'
import { crearInventario } from '../src/domain/pagos/pago.js'
import { crearExcelCartillas } from '../src/infrastructure/reportes/crearExcelCartillas.js'

test('el Excel contiene la solo las cartillas asignadas con su grupo y estado', async () => {
  const inventario = crearInventario([
    { numero: 1, responsable: 'Persona' },
    { numero: 500 }, // Pagada pero sin asignación.
    { numero: 3000, responsable: null },
  ], [
    { inicio: 3000, fin: 3000, grupoId: 'b' }, { inicio: 1, fin: 2, grupoId: 'a' },
  ], [{ id: 'a', nombre: '=Coro & Jóvenes' }, { id: 'b', nombre: 'Sin asignar' }])
  const libro = crearExcelCartillas(inventario)
  const partes = unzipSync(new Uint8Array(await libro.arrayBuffer()))
  const hoja = strFromU8(partes['xl/worksheets/sheet1.xml'])
  const tabla = strFromU8(partes['xl/tables/table1.xml'])
  assert.match(tabla, /<autoFilter ref="A1:C4"/)
  assert.match(hoja, /<tablePart r:id="rId1"/)
  assert.equal((hoja.match(/<row /g) || []).length, 4)
  const filas = [...hoja.matchAll(/<row [^>]+>(.*?)<\/row>/gs)]
  const valores = i => [...filas[i][1].matchAll(/<t xml:space="preserve">(.*?)<\/t>/gs)].map(m => m[1])
  assert.deepEqual(valores(0), ['Número de cartilla', 'Grupo', 'Estado de pago'])
  assert.deepEqual(valores(1), ['00001', '=Coro &amp; Jóvenes', 'Pagada'])
  assert.deepEqual(valores(2), ['00002', '=Coro &amp; Jóvenes', 'Pendiente'])
  assert.deepEqual(valores(3), ['03000', 'Sin asignar', 'Pagada'])
  assert.doesNotMatch(hoja, /<f[ >]/)
})

test('sin asignaciones se omite la descarga aunque existan pagos', () => {
  assert.equal(crearExcelCartillas(crearInventario([{ numero: 1 }])), null)
})
