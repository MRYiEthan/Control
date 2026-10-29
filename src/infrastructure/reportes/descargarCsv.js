/** Infraestructura del navegador: descarga un CSV generado por Application. */
export function descargarCsv(nombre, contenido) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(blob)
  enlace.href = url
  enlace.download = nombre
  enlace.style.display = 'none'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
