import { crearAsignacion } from '@/domain/distribucion/crearAsignacion'
export function crearGestorDistribucion(repository){
  return {
    listar:()=>repository.listar(),
    async asignar(datos){
      const existentes=await repository.listar()
      const nuevo=crearAsignacion({ ...datos, asignaciones:existentes })
      await repository.crear(nuevo)
      return nuevo
    },
    eliminar:(id)=>repository.eliminar(id),
  }
}
