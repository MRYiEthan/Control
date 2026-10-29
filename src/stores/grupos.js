import { defineStore } from 'pinia'
import { ref } from 'vue'

import { crearGestorGrupos } from '@/application/grupos/gestionarGrupos'
import { gruposRepository } from '@/infrastructure/grupos/gruposRepository'

const gestor = crearGestorGrupos(gruposRepository)

export const useGruposStore = defineStore('grupos', () => {
  const grupos = ref([])

  async function cargar() {
    grupos.value = await gestor.listar()
  }

  async function guardar(datos) {
    if (datos.id) {
      await gestor.actualizar(datos.id, datos)
    } else {
      await gestor.registrar(datos)
    }

    await cargar()
  }

  async function eliminar(id) {
    await gestor.eliminar(id)
    await cargar()
  }

  function limpiar() {
    grupos.value = []
  }

  return {
    grupos,
    cargar,
    guardar,
    eliminar,
    limpiar,
  }
})
