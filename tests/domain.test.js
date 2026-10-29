import test from 'node:test'
import assert from 'node:assert/strict'
import { crearNumeroCarton } from '../src/domain/cartones/numeroCarton.js'
import { crearGrupo } from '../src/domain/grupos/grupo.js'
import { crearAsignacion, formatearNumero } from '../src/domain/distribucion/crearAsignacion.js'

test('numeración de cinco dígitos',()=>{
  assert.equal(crearNumeroCarton(1),'00001')
  assert.equal(crearNumeroCarton(3000),'03000')
  assert.equal(formatearNumero(125),'00125')
})
test('rechaza numeración fuera del catálogo',()=>{
  assert.throws(()=>crearNumeroCarton(0))
  assert.throws(()=>crearNumeroCarton(3001))
})
test('valida datos obligatorios del grupo',()=>{
  assert.throws(()=>crearGrupo({id:'1',nombre:'',responsable:'Ana',area:'A'}))
  assert.equal(crearGrupo({id:'1',nombre:'  Grupo A  ',responsable:'Ana',area:'Pastoral'}).nombre,'Grupo A')
})
test('calcula cantidad de un rango inclusivo',()=>{
  assert.equal(crearAsignacion({grupoId:'g1',inicio:121,fin:130}).cantidad,10)
})
test('no permite rangos fuera del catálogo ni invertidos',()=>{
  assert.throws(()=>crearAsignacion({grupoId:'g1',inicio:0,fin:2}))
  assert.throws(()=>crearAsignacion({grupoId:'g1',inicio:3001,fin:3002}))
  assert.throws(()=>crearAsignacion({grupoId:'g1',inicio:130,fin:121}))
})
test('impide superposiciones',()=>{
  const a=crearAsignacion({grupoId:'g1',inicio:121,fin:130})
  assert.throws(()=>crearAsignacion({grupoId:'g2',inicio:125,fin:140,asignaciones:[a]}),/superpone/)
  assert.equal(crearAsignacion({grupoId:'g2',inicio:131,fin:140,asignaciones:[a]}).cantidad,10)
})
