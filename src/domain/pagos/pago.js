import { crearNumeroCarton } from '../cartones/numeroCarton.js'

export const MEDIOS_PAGO = ['Efectivo', 'Yape', 'Plin', 'Transferencia']

export function numerosDelRango(desde, hasta) {
  const extremos = [desde, hasta].map(valor => {
    const texto = String(valor ?? '').trim()
    if (!/^[0-9]{1,5}$/.test(texto)) throw new Error('Completa Desde y Hasta con números entre 00001 y 03000')
    return Number(crearNumeroCarton(texto))
  })
  if (extremos[0] > extremos[1]) throw new Error('Desde no puede ser mayor que Hasta')
  return Array.from({ length: extremos[1] - extremos[0] + 1 }, (_, i) => extremos[0] + i)
}

export function crearPagosRango({ desde, hasta, medio, responsable }, existentes = []) {
  const numeros = numerosDelRango(desde, hasta)
  const ocupadas = new Set(existentes.map(p => p.numero))
  const duplicada = numeros.find(numero => ocupadas.has(numero))
  if (duplicada !== undefined) throw new Error('La cartilla #' + String(duplicada).padStart(5, '0') + ' ya está pagada. No se registró el rango.')
  const fecha = new Date().toISOString()
  return numeros.map(numero => ({ ...crearPago({ numero, medio, responsable }), created_at: fecha }))
}

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
