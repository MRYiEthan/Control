export async function listarPorPaginas(consulta) {
  const tamano = 500
  const filas = []
  for (let inicio = 0; ; inicio += tamano) {
    const { data, error } = await consulta().range(inicio, inicio + tamano - 1)
    if (error) throw error
    filas.push(...data)
    if (data.length < tamano) return filas
  }
}
