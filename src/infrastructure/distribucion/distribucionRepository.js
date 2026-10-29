import { supabase } from '@/infrastructure/supabase/supabaseClient'
const KEY='control-bingo:asignaciones-demo:v1'
function leer(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
function escribir(items){localStorage.setItem(KEY,JSON.stringify(items))}
function normalizar(row){return { id:row.id, grupoId:row.grupo_id ?? row.grupoId, inicio:row.inicio, fin:row.fin, cantidad:row.fin-row.inicio+1, created_at:row.created_at }}
export const distribucionRepository={
  async listar(){
    if(!supabase)return leer()
    const {data,error}=await supabase.from('asignaciones_demo').select('id,grupo_id,inicio,fin,created_at').order('inicio')
    if(error)throw new Error('No se pudo obtener la distribución. Revisa el archivo supabase/schema.sql. '+error.message)
    return (data||[]).map(normalizar)
  },
  async crear(asignacion){
    if(!supabase){escribir([...leer(),asignacion]);return}
    const {error}=await supabase.from('asignaciones_demo').insert({id:asignacion.id,grupo_id:asignacion.grupoId,inicio:asignacion.inicio,fin:asignacion.fin})
    if(error)throw new Error(error.code==='23P01'?'Los números ya están asignados a otro grupo':error.message)
  },
  async eliminar(id){
    if(!supabase){escribir(leer().filter(x=>x.id!==id));return}
    const {data,error}=await supabase.from('asignaciones_demo').delete().eq('id',id).select('id').maybeSingle()
    if(error)throw error
    if(!data)throw new Error('Asignación no encontrada o sin permisos')
  }
}
