import { crearPago, crearPagosRango } from '../../domain/pagos/pago.js'

export function crearGestorPagos(repository) {
  return {
    listar: () => repository.listar(),
    async registrarRango(datos) {
      const existentes = await repository.listar()
      return repository.crearLote(crearPagosRango(datos, existentes))
    },
    async editar(numeroOriginal, datos) {
      const existentes = await repository.listar()
      if (!existentes.some(p => p.numero === numeroOriginal)) throw new Error('Pago no encontrado. Actualiza el inventario.')
      const pago = crearPago(datos, existentes.filter(p => p.numero !== numeroOriginal))
      return repository.editar(numeroOriginal, pago)
    },
    devolverPendiente: numero => repository.eliminar(numero),
    async registrar(datos) {
      const existentes = await repository.listar()
      return repository.crear(crearPago(datos, existentes))
    },
  }
}
