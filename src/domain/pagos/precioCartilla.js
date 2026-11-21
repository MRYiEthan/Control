const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

export const enSoles = centimos => moneda.format(centimos / 100)

export function leerPrecio(valor) {
  const texto = String(valor ?? '').trim().replace(',', '.')
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(texto)) throw new Error('Ingresa un precio en soles con hasta dos decimales.')
  const [entero, decimal = ''] = texto.split('.')
  const centimos = Number(entero) * 100 + Number(decimal.padEnd(2, '0'))
  if (centimos === 0) throw new Error('El precio debe ser mayor que cero.')
  return centimos
}

export function cantidadCartillas(valor) {
  const n = Number(valor)
  return /^\d+$/.test(String(valor)) && Number.isInteger(n) && n >= 1 && n <= 3000 ? n : null
}

export function listarNumeros(numeros) {
  const codigo = n => String(n).padStart(5, '0')
  const rangos = []
  for (let i = 0; i < numeros.length; i++) {
    const inicio = numeros[i]
    while (numeros[i + 1] === numeros[i] + 1) i++
    rangos.push(inicio === numeros[i] ? codigo(inicio) : codigo(inicio) + '–' + codigo(numeros[i]))
  }
  return rangos.join(', ')
}
