import test from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8, unzipSync } from 'fflate'
import { crearInventario } from '../src/domain/pagos/pago.js'
import { crearExcelCartillas } from '../src/infrastructure/reportes/crearExcelCartillas.js'

test('el Excel contiene la tabla completa con números de cinco cifras, responsables y estados', async () => {
  const inventario = crearInventario([
    { numero: 1, responsable: '=María & José' },
    { numero: 3000, responsable: null },
  ])
  const libro = crearExcelCartillas(inventario)
  const partes = unzipSync(new Uint8Array(await libro.arrayBuffer()))
  const hoja = strFromU8(partes['xl/worksheets/sheet1.xml'])
  const tabla = strFromU8(partes['xl/tables/table1.xml'])
  assert.match(tabla, /<autoFilter ref="A1:C3001"/)
  assert.match(hoja, /<tablePart r:id="rId1"/)
  assert.equal((hoja.match(/<row /g) || []).length, 3001)
  const filas = [...hoja.matchAll(/<row [^>]+>(.*?)<\/row>/gs)]
  const valores = i => [...filas[i][1].matchAll(/<t xml:space="preserve">(.*?)<\/t>/gs)].map(m => m[1])
  assert.deepEqual(valores(0), ['Número de cartilla', 'Responsable del pago', 'Estado de pago'])
  assert.deepEqual(valores(1), ['00001', '=María &amp; José', 'Pagada'])
  assert.deepEqual(valores(2), ['00002', '', 'Pendiente'])
  assert.deepEqual(valores(3000), ['03000', 'Sin registrar', 'Pagada'])
  assert.doesNotMatch(hoja, /<f[ >]/)
})
