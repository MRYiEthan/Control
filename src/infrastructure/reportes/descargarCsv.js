import { descargarArchivo } from './descargarArchivo.js'

export function descargarCsv(nombre, contenido) {
  descargarArchivo(nombre, new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
}
