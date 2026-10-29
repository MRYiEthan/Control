
import { crearGrupo } from '@/domain/grupos/grupo'

export function crearGestorGrupos(repository) {
  return {
    async listar() {
      return await repository.listar()
    },

    async registrar(datos) {
      const grupo = crearGrupo({
        ...datos,
        id: crypto.randomUUID(),
      })

      await repository.crear(grupo)
      return grupo
    },

    async actualizar(id, datos) {
      const grupo = crearGrupo({
        ...datos,
        id,
      })

      await repository.actualizar(grupo)
      return grupo
    },

    async eliminar(id) {
      await repository.eliminar(id)
    },
  }
}

