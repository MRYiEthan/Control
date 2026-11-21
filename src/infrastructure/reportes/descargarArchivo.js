export function descargarArchivo(nombre, blob) {
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
