import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { crearNumeroCarton } from '@/domain/cartones/numeroCarton'

export const useCatalogoStore = defineStore('catalogo', () => {
  const total = 3000
  const numeroActual = ref(1)

  const numeroEjemplo = computed(() => crearNumeroCarton(numeroActual.value))

  function siguiente() {
    numeroActual.value = numeroActual.value === total ? 1 : numeroActual.value + 1
  }

  return {
    total,
    numeroEjemplo,
    siguiente,
  }
})
