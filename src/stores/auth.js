import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, supabaseConfigurado } from '@/infrastructure/supabase/supabaseClient'

export const useAuthStore = defineStore('auth', () => {
  const usuario = ref(null)
  const inicializado = ref(false)
  const configurado = supabaseConfigurado
  let iniciando = null

  async function inicializar() {
    if (inicializado.value) return
    if (iniciando) return iniciando
    iniciando = (async () => {
      if (!configurado) {
        usuario.value = { id: 'local-demo', email: 'demo@local.invalid' }
      } else {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (data.session) {
          const resultado = await supabase.auth.getUser()
          if (resultado.error) throw resultado.error
          usuario.value = resultado.data.user
        } else usuario.value = null
      }
      inicializado.value = true
    })()
    try { await iniciando } finally { iniciando = null }
  }
  async function iniciarSesion(email, password) {
    if (!configurado) { usuario.value = { id: 'local-demo', email: 'demo@local.invalid' }; inicializado.value=true; return }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    usuario.value = data.user
    inicializado.value = true
  }
  async function registrar(email, password) {
    if (!configurado) throw new Error('En modo local no necesitas crear una cuenta.')
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
    if (error) throw error
    if (data.session) usuario.value = data.user
    return Boolean(data.session)
  }
  async function cerrarSesion() {
    if (configurado) { const { error } = await supabase.auth.signOut(); if (error) throw error }
    usuario.value = configurado ? null : { id: 'local-demo', email: 'demo@local.invalid' }
    inicializado.value = true
  }
  return { usuario, inicializado, configurado, inicializar, iniciarSesion, registrar, cerrarSesion }
})
