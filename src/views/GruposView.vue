<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { crearReporteGrupos } from '@/application/reportes/generarReportes'
import { descargarCsv } from '@/infrastructure/reportes/descargarCsv'
import { useGruposStore } from '@/stores/grupos'
import { useDistribucionStore } from '@/stores/distribucion'
const store=useGruposStore(), distribucion=useDistribucionStore()
const form=reactive({ id:null, nombre:'',responsable:'',area:'' })
const areas=['Evangelización y Catequesis','Liturgia y Espiritualidad','Comunidades Territoriales','Familia y Vida','Juventud','Otros']
const busqueda=ref(''), filtro=ref('todos'), mensaje=ref(''), error=ref(''), cargando=ref(false)
const gruposConAsignacion=computed(()=>new Set(distribucion.asignaciones.map(a=>a.grupoId)))
const visibles=computed(()=>store.grupos.filter(g=>[g.nombre,g.responsable,g.area].join(' ').toLowerCase().includes(busqueda.value.toLowerCase()) && (filtro.value==='todos'|| (filtro.value==='asignados'?gruposConAsignacion.value.has(g.id):!gruposConAsignacion.value.has(g.id)))))
function limpiar(){Object.assign(form,{id:null,nombre:'',responsable:'',area:''})}
async function cargar(){cargando.value=true;error.value='';try{await Promise.all([store.cargar(),distribucion.cargar()])}catch(e){error.value=e.message}finally{cargando.value=false}}
onMounted(cargar)
async function guardar(){mensaje.value='';error.value='';cargando.value=true;try{const editando=Boolean(form.id);await store.guardar({...form});mensaje.value=editando?'Grupo actualizado correctamente':'Grupo registrado correctamente';limpiar()}catch(e){error.value=e.message}finally{cargando.value=false}}
function editar(g){Object.assign(form,g);mensaje.value='';error.value='';window.scrollTo({top:0,behavior:'smooth'})}
async function eliminar(g){error.value='';mensaje.value='';if(gruposConAsignacion.value.has(g.id)){error.value='Libera primero los cartones asignados a este grupo.';return}if(!confirm(`¿Eliminar el grupo «${g.nombre}»?`))return;try{await store.eliminar(g.id);mensaje.value='Grupo eliminado correctamente';if(form.id===g.id)limpiar()}catch(e){error.value=e.message}}
async function exportarGrupos(){
  error.value='';mensaje.value='';cargando.value=true
  try{
    await Promise.all([store.cargar(), distribucion.cargar()])
    descargarCsv('control-de-bingo-grupos.csv', crearReporteGrupos(store.grupos, distribucion.asignaciones))
    mensaje.value='CSV de grupos descargado. Incluye únicamente los datos de tu sesión.'
  }catch(e){error.value=e.message || 'No se pudo exportar el CSV'}
  finally{cargando.value=false}
}

</script>
<template>
  <div class="page-header"><div><h1>Grupos pastorales</h1><p>Administración de grupos y responsables</p></div><div class="page-actions"><button class="outline-btn" :disabled="cargando" @click="exportarGrupos"><AppIcon name="download" :size="17"/> Exportar CSV</button><button class="primary-btn" @click="limpiar"><AppIcon name="plus" :size="17"/> Nuevo grupo</button></div></div>
  <div class="stats-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="surface metric-card"><div class="metric-icon blue"><AppIcon name="users" :size="25"/></div><div><div class="metric-title">Total grupos</div><div class="metric-value">{{store.grupos.length}}</div><div class="metric-note">Registrados</div></div></div>
    <div class="surface metric-card"><div class="metric-icon green"><AppIcon name="ticket" :size="25"/></div><div><div class="metric-title">Con cartones asignados</div><div class="metric-value">{{gruposConAsignacion.size}}</div><div class="metric-note">Grupos activos</div></div></div>
    <div class="surface metric-card"><div class="metric-icon amber"><AppIcon name="clock" :size="25"/></div><div><div class="metric-title">Sin asignación</div><div class="metric-value">{{Math.max(0,store.grupos.length-gruposConAsignacion.size)}}</div><div class="metric-note">Pendientes</div></div></div>
  </div>
  <div v-if="error" class="notice error" role="alert"><AppIcon name="alert"/> {{error}}</div><div v-if="mensaje" class="notice success" role="status"><AppIcon name="check"/> {{mensaje}}</div>
  <div class="surface toolbar"><div class="search-box"><AppIcon name="search" :size="18"/><input v-model="busqueda" placeholder="Buscar grupo, responsable o área..." aria-label="Buscar grupos"/></div><select v-model="filtro" class="select-small" aria-label="Filtrar grupos"><option value="todos">Todos los grupos</option><option value="asignados">Con cartones asignados</option><option value="pendientes">Sin asignación</option></select></div>
  <div class="section-grid">
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon :name="form.id?'edit':'plus'"/> {{form.id?'Editar grupo':'Nuevo grupo'}}</h2></div>
      <form @submit.prevent="guardar"><div class="field"><label for="nombre">Nombre del grupo *</label><input id="nombre" v-model="form.nombre" maxlength="140" required placeholder="Ej. Catequesis de Niños"/></div>
        <div class="field"><label for="responsable">Responsable *</label><input id="responsable" v-model="form.responsable" maxlength="140" required placeholder="Nombre del responsable"/></div>
        <div class="field"><label for="area">Área pastoral *</label><select id="area" v-model="form.area" required><option value="" disabled>Seleccionar área pastoral</option><option v-for="a in areas" :key="a">{{a}}</option></select></div>
        <button type="submit" class="primary-btn full-width" :disabled="cargando"><AppIcon name="check" :size="17"/>{{form.id?'Actualizar grupo':'Guardar grupo'}}</button><button v-if="form.id" type="button" class="subtle-btn full-width" style="margin-top:9px" @click="limpiar">Cancelar edición</button>
      </form>
    </section>
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="users"/> Grupos registrados</h2><span class="helper">Mostrando {{visibles.length}} de {{store.grupos.length}}</span></div><div class="table-scroll"><table><thead><tr><th>Grupo</th><th>Responsable</th><th>Área</th><th>Cartones</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="g in visibles" :key="g.id"><td><strong>{{g.nombre}}</strong></td><td>{{g.responsable}}</td><td>{{g.area}}</td><td>{{distribucion.asignaciones.filter(a=>a.grupoId===g.id).reduce((sum,a)=>sum+a.cantidad,0)}}</td><td><span class="status" :class="gruposConAsignacion.has(g.id)?'green':'gray'">{{gruposConAsignacion.has(g.id)?'Asignado':'Sin asignar'}}</span></td><td><div class="table-actions"><button class="outline-btn button-sm" @click="editar(g)"><AppIcon name="edit" :size="13"/>Editar</button><button class="danger-btn button-sm" @click="eliminar(g)"><AppIcon name="trash" :size="13"/>Eliminar</button></div></td></tr></tbody></table><div v-if="!visibles.length" class="empty-state"><AppIcon name="users" :size="28"/><strong>No hay grupos para mostrar</strong><span>{{cargando?'Cargando...':'Crea un grupo o cambia el filtro.'}}</span></div></div></section>
  </div>
</template>
