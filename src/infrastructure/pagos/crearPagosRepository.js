const KEY = 'control-bingo:pagos:v1'
const COLUMNAS = 'numero,medio,responsable,created_at'
const TAMANO_PAGINA = 500

export function crearPagosRepository({ cliente = null, storage }) {
  function leer() {
    const datos = JSON.parse(storage.getItem(KEY) || '[]')
    if (!Array.isArray(datos) || datos.some(p =>
      !Number.isInteger(p?.numero) || p.numero < 1 || p.numero > 3000
    )) throw new Error('Los pagos locales no son válidos. No se modificaron los datos.')
    return datos
  }
  return {
    async listar() {
      if (!cliente) return leer()
      const pagos = []
      // Supabase limita el número de filas de cada respuesta.
      for (let desde = 0; ; desde += TAMANO_PAGINA) {
        const { data, error } = await cliente.from('pagos_cartillas')
          .select(COLUMNAS).order('numero').range(desde, desde + TAMANO_PAGINA - 1)
        if (error) throw new Error('No se pudieron cargar los pagos. Verifica supabase/pagos.sql. ' + error.message)
        pagos.push(...(data || []))
        if (!data || data.length < TAMANO_PAGINA) return pagos
      }
    },
    async editar(numeroOriginal, pago) {
      const cambios = { numero: pago.numero, medio: pago.medio, responsable: pago.responsable }
      if (!cliente) {
        const pagos = leer()
        const anterior = pagos.find(p => p.numero === numeroOriginal)
        if (!anterior) throw new Error('Pago no encontrado. Actualiza el inventario.')
        if (pagos.some(p => p.numero === pago.numero && p.numero !== numeroOriginal)) {
          throw new Error('La cartilla de destino ya está pagada')
        }
        const actualizado = { ...anterior, ...cambios }
        storage.setItem(KEY, JSON.stringify(pagos.map(p => p.numero === numeroOriginal ? actualizado : p)))
        return actualizado
      }
      const { data, error } = await cliente.from('pagos_cartillas').update(cambios)
        .eq('numero', numeroOriginal).select(COLUMNAS).maybeSingle()
      if (error) throw new Error(error.code === '23505'
        ? 'La cartilla de destino ya está pagada'
        : 'No se pudo editar el pago. ' + error.message)
      if (!data) throw new Error('Pago no encontrado o sin permisos. Actualiza el inventario.')
      return data
    },
    async eliminar(numero) {
      if (!cliente) {
        const pagos = leer()
        if (!pagos.some(p => p.numero === numero)) throw new Error('Pago no encontrado. Actualiza el inventario.')
        storage.setItem(KEY, JSON.stringify(pagos.filter(p => p.numero !== numero)))
        return
      }
      const { data, error } = await cliente.from('pagos_cartillas').delete()
        .eq('numero', numero).select('numero').maybeSingle()
      if (error) throw new Error('No se pudo devolver a pendiente. ' + error.message)
      if (!data) throw new Error('Pago no encontrado o sin permisos. Actualiza el inventario.')
    },
    async crear(pago) {
      if (!cliente) {
        const pagos = leer()
        if (pagos.some(p => p.numero === pago.numero)) throw new Error('Esta cartilla ya está pagada')
        storage.setItem(KEY, JSON.stringify([...pagos, pago]))
        return pago
      }
      const { data, error } = await cliente.from('pagos_cartillas')
        .insert({ numero: pago.numero, medio: pago.medio, responsable: pago.responsable }).select(COLUMNAS).single()
      if (error) throw new Error(error.code === '23505'
        ? 'Esta cartilla ya está pagada. Actualiza el inventario.'
        : 'No se pudo registrar el pago. ' + error.message)
      return data
    },
  }
}
