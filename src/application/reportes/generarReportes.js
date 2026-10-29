import { formatearNumero } from '../../domain/distribucion/crearAsignacion.js'

/**
 * CSV separado por ; (compatible con configuraciones regionales que usan coma decimal).
 * Evita que los campos libres ejecuten fórmulas al abrirse en hojas de cálculo.
 */
export function generarCsv(columnas, filas) {
  function celda(valor) {
    const texto = String(valor ?? '')
    const protegido = /^[\s\u0000-\u001f]*[=+\-@]/u.test(texto) ? `'${texto}` : texto
    return `"${protegido.replaceAll('"', '""')}"`
  }
  const lineas = [columnas, ...filas].map(fila => fila.map(celda).join(';'))
  return '\uFEFF' + lineas.join('\r\n') + '\r\n'
}

export function crearReporteGrupos(grupos, asignaciones) {
  const cifras = new Map()
  const rangos = new Map()
  for (const item of asignaciones) {
    cifras.set(item.grupoId, (cifras.get(item.grupoId) || 0) + item.cantidad)
    const actuales = rangos.get(item.grupoId) || []
    actuales.push(`${formatearNumero(item.inicio)}-${formatearNumero(item.fin)}`)
    rangos.set(item.grupoId, actuales)
  }
  return generarCsv(
    ['Grupo', 'Responsable', 'Área pastoral', 'Cartones asignados', 'Rangos asignados'],
    [...grupos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map(grupo => [
        grupo.nombre,
        grupo.responsable,
        grupo.area,
        cifras.get(grupo.id) || 0,
        (rangos.get(grupo.id) || []).join(' | ')
      ])
  )
}

export function crearReporteDistribucion(asignaciones, grupos) {
  const mapa = new Map(grupos.map(grupo => [grupo.id, grupo]))
  return generarCsv(
    ['Grupo', 'Responsable', 'Área pastoral', 'Número inicial', 'Número final', 'Cantidad de cartones'],
    [...asignaciones].sort((a, b) => a.inicio - b.inicio).map(item => {
      const grupo = mapa.get(item.grupoId)
      return [
        grupo?.nombre || 'Grupo no disponible',
        grupo?.responsable || '',
        grupo?.area || '',
        formatearNumero(item.inicio),
        formatearNumero(item.fin),
        item.cantidad
      ]
    })
  )
}
