export function validarNombreVenta(valor) {
  const nombre = String(valor ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ')
  const formato = /^\p{L}+(?:[ '’-]\p{L}+)*$/u
  if (!formato.test(nombre) || [...nombre].length > 120 || nombre.match(/\p{L}/gu).length < 2) {
    throw new Error('Escribe un nombre de al menos dos letras. Puedes usar espacios, guiones o apóstrofes entre palabras.')
  }
  return nombre
}
