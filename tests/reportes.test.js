import test from 'node:test'
import assert from 'node:assert/strict'
import { generarCsv, crearReporteGrupos, crearReporteDistribucion } from '../src/application/reportes/generarReportes.js'

const grupos = [
  { id:'g1', nombre:'Catequesis de Niños', responsable:'Ana', area:'Evangelización' },
  { id:'g2', nombre:'Coro Caridad', responsable:'Luis', area:'Liturgia' },
]
const asignaciones = [
  { id:'a1', grupoId:'g1', inicio:121, fin:130, cantidad:10 },
  { id:'a2', grupoId:'g1', inicio:140, fin:141, cantidad:2 },
  { id:'a3', grupoId:'g2', inicio:301, fin:305, cantidad:5 },
]

test('reporta cartones asignados por grupo y conserva los rangos con cinco cifras', () => {
  const csv = crearReporteGrupos(grupos, asignaciones)
  assert.match(csv, /Catequesis de Niños/)
  assert.match(csv, /"12"/)
  assert.match(csv, /00121-00130 \| 00140-00141/)
})

test('reporte de distribución incluye las etiquetas de grupo y numeración completa', () => {
  const csv = crearReporteDistribucion(asignaciones, grupos)
  assert.match(csv, /"00121";"00130";"10"/)
  assert.match(csv, /"Coro Caridad"/)
})

test('CSV escapa comillas, separadores y neutraliza fórmulas de celdas', () => {
  const csv = generarCsv(['Nombre'], [['=HYPERLINK("ejemplo")'], ['Grupo; "Especial"']])
  assert.ok(csv.startsWith('\uFEFF'))
  assert.match(csv, /'\=HYPERLINK\(""ejemplo""\)/)
  assert.match(csv, /"Grupo; ""Especial"""/)
})

test('crear reportes no modifica el orden de los arreglos originales', () => {
  const antes = asignaciones.map(a => a.id).join(',')
  crearReporteDistribucion(asignaciones, grupos)
  assert.equal(asignaciones.map(a => a.id).join(','), antes)
})
