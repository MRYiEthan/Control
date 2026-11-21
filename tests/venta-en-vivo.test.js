import test from 'node:test'
import assert from 'node:assert/strict'
import { validarNombreVenta } from '../src/domain/pagos/nombreVenta.js'

test('admite nombres con tildes, espacios, guiones y apóstrofes', () => {
  assert.equal(validarNombreVenta('  Mari\u0301a-José   D’Angelo  '), 'María-José D’Angelo')
  assert.equal(validarNombreVenta('Li'), 'Li')
})
test('rechaza nombres vacíos, símbolos, números y letras aisladas', () => {
  for (const valor of ['   ', '.', '—', '1234', 'A', ' - ', '💰', 'P3dro', 'a'.repeat(121)]) {
    assert.throws(() => validarNombreVenta(valor))
  }
})
