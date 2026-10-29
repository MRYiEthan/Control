export function crearNumeroCarton(valor) {
  const numero = Number(valor)

  if (!Number.isInteger(numero) || numero < 1 || numero > 3000) {
    throw new Error('El número debe estar entre 00001 y 03000')
  }

  return String(numero).padStart(5, '0')
}
