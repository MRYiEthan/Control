import { supabase } from '@/infrastructure/supabase/supabaseClient'

const KEY = 'control-bingo:grupos-demo:v1'
const ejemplos = [
  { id: 'a684be71-312b-4bf8-8257-0c96dba41701', nombre: 'Catequesis de Niños', responsable: 'Ana Torres', area: 'Evangelización y Catequesis' },
  { id: 'a684be71-312b-4bf8-8257-0c96dba41702', nombre: 'Coro Caridad', responsable: 'María Campos', area: 'Liturgia y Espiritualidad' },
  { id: 'a684be71-312b-4bf8-8257-0c96dba41703', nombre: 'Zona Pastoral Belén', responsable: 'Carlos Herrera', area: 'Comunidades Territoriales' },
  { id: 'a684be71-312b-4bf8-8257-0c96dba41704', nombre: 'Jóvenes Misioneros', responsable: 'Laura Medina', area: 'Juventud' },
]
function leer() { try { const v=localStorage.getItem(KEY); return v ? JSON.parse(v) : ejemplos } catch { return ejemplos } }
function escribir(items) { localStorage.setItem(KEY,JSON.stringify(items)) }

export const gruposRepository = {
  async listar() {
    if (!supabase) return [...leer()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))
    const {data,error}=await supabase.from('grupos_demo').select('id,nombre,responsable,area').order('nombre')
    if(error) throw error
    return data || []
  },
  async crear(grupo) {
    if (!supabase) { escribir([...leer(),grupo]); return }
    const {error}=await supabase.from('grupos_demo').insert({id:grupo.id,nombre:grupo.nombre,responsable:grupo.responsable,area:grupo.area})
    if(error) throw error
  },
  async actualizar(grupo) {
    if(!supabase) { const items=leer(); if(!items.some(x=>x.id===grupo.id))throw new Error('Grupo no encontrado'); escribir(items.map(x=>x.id===grupo.id?grupo:x)); return }
    const {data,error}=await supabase.from('grupos_demo').update({nombre:grupo.nombre,responsable:grupo.responsable,area:grupo.area}).eq('id',grupo.id).select('id').maybeSingle()
    if(error)throw error
    if(!data)throw new Error('Grupo no encontrado o sin permisos')
  },
  async eliminar(id) {
    if(!supabase) { escribir(leer().filter(x=>x.id!==id)); return }
    const {data,error}=await supabase.from('grupos_demo').delete().eq('id',id).select('id').maybeSingle()
    if(error)throw error
    if(!data)throw new Error('Grupo no encontrado o sin permisos')
  },
}
