import { crearNumeroCarton } from '../cartones/numeroCarton.js'

export const MEDIOS_PAGO = ['Efectivo', 'Yape', 'Plin', 'Transferencia']

export function crearPago({ numero, medio, responsable }, existentes = []) {
  const texto = String(numero ?? '').trim()
  if (!/^[0-9]{1,5}$/.test(texto)) throw new Error('Introduce un número entre 00001 y 03000')
  const valor = Number(crearNumeroCarton(texto))
  if (!MEDIOS_PAGO.includes(medio)) throw new Error('Selecciona un medio de pago válido')
  if (existentes.some(p => p.numero === valor)) throw new Error('Esta cartilla ya está pagada')
  const nombre = String(responsable ?? '').trim()
  if (!nombre || nombre.length > 120) throw new Error('Indica el responsable del pago (máximo 120 caracteres)')
  return { numero: valor, medio, responsable: nombre, created_at: new Date().toISOString() }
}

export function crearInventario(pagos, asignaciones = [], grupos = []) {
  const porNumero = new Map(pagos.map(p => [p.numero, p]))
  const porGrupo = new Map(grupos.map(g => [g.id, g]))
  return Array.from({ length: 3000 }, (_, i) => {
    const numero = i + 1
    const asignacion = asignaciones.find(a => numero >= a.inicio && numero <= a.fin)
    const pago = porNumero.get(numero)
    return {
      numero, codigo: crearNumeroCarton(numero),
      grupo: porGrupo.get(asignacion?.grupoId)?.nombre || 'Sin asignar',
      estado: pago ? 'Pagada' : 'Pendiente', pago,
    }
  })
}
