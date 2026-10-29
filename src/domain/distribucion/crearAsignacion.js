const LIMITE = 3000
export function crearAsignacion({ id = crypto.randomUUID(), grupoId, inicio, fin, asignaciones = [] }) {
  const desde = Number(inicio)
  const hasta = Number(fin)
  if (!grupoId) throw new Error('Selecciona un grupo pastoral')
  if (!Number.isInteger(desde) || !Number.isInteger(hasta) || desde < 1 || hasta > LIMITE || desde > hasta)
    throw new Error('Los números deben estar entre 00001 y 03000 y el inicio no puede superar al final')
  if (asignaciones.some(actual => actual.id !== id && desde <= actual.fin && actual.inicio <= hasta))
    throw new Error('El rango se superpone con una asignación existente')
  return Object.freeze({ id, grupoId, inicio: desde, fin: hasta, cantidad: hasta - desde + 1 })
}
export const formatearNumero = n => String(Number(n)).padStart(5,'0')
