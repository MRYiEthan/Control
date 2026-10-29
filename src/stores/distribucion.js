import { defineStore } from 'pinia'
import { ref } from 'vue'
import { crearGestorDistribucion } from '@/application/distribucion/gestionarDistribucion'
import { distribucionRepository } from '@/infrastructure/distribucion/distribucionRepository'
const gestor=crearGestorDistribucion(distribucionRepository)
export const useDistribucionStore=defineStore('distribucion',()=>{
  const asignaciones=ref([]), loading=ref(false)
  async function cargar(){loading.value=true;try{asignaciones.value=await gestor.listar()}finally{loading.value=false}}
  async function asignar(datos){await gestor.asignar(datos);await cargar()}
  async function eliminar(id){await gestor.eliminar(id);await cargar()}
  function limpiar(){asignaciones.value=[]}
  return {asignaciones,loading,cargar,asignar,eliminar,limpiar}
})
