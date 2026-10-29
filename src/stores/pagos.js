import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { supabase } from '@/infrastructure/supabase/supabaseClient'
import { crearPagosRepository } from '@/infrastructure/pagos/crearPagosRepository'
import { crearGestorPagos } from '@/application/pagos/gestionarPagos'

export const usePagosStore = defineStore('pagos', () => {
  const auth = useAuthStore()
  const pagos = ref([])
  const listo = ref(false)
  let version = 0
  const gestor = crearGestorPagos(crearPagosRepository({
    cliente: supabase,
    storage: {
      getItem: key => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    },
  }))
  function limpiar() { version++; pagos.value = []; listo.value = false }
  watch(() => auth.usuario?.id, limpiar, { flush: 'sync' })
  async function cargar() {
    const actual = ++version
    listo.value = false
    try {
      const resultado = await gestor.listar()
      if (actual !== version) return
      pagos.value = resultado
      listo.value = true
    } catch (error) {
      if (actual === version) pagos.value = []
      throw error
    }
  }
  async function registrar(datos) {
    const actual = version
    const pago = await gestor.registrar(datos)
    if (actual === version) {
      pagos.value = [...pagos.value.filter(p => p.numero !== pago.numero), pago]
    }
    return pago
  }
  async function editar(numeroOriginal, datos) {
    const actual = version
    const pago = await gestor.editar(numeroOriginal, datos)
    if (actual === version) {
      pagos.value = [...pagos.value.filter(p => p.numero !== numeroOriginal && p.numero !== pago.numero), pago]
    }
    return pago
  }
  async function devolverPendiente(numero) {
    const actual = version
    await gestor.devolverPendiente(numero)
    if (actual === version) pagos.value = pagos.value.filter(p => p.numero !== numero)
  }
  return { pagos, listo, cargar, registrar, editar, devolverPendiente, limpiar }
})
