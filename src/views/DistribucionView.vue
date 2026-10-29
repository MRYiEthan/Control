<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { crearReporteDistribucion } from '@/application/reportes/generarReportes'
import { descargarCsv } from '@/infrastructure/reportes/descargarCsv'
import { useDistribucionStore } from '@/stores/distribucion'
import { useGruposStore } from '@/stores/grupos'
import { crearAsignacion, formatearNumero } from '@/domain/distribucion/crearAsignacion'
const store=useDistribucionStore(), grupos=useGruposStore()
const grupoId=ref(''), inicio=ref('00121'), fin=ref('00130'), error=ref(''), mensaje=ref(''), cargando=ref(false), filtro=ref(''), textoBusqueda=ref('')
const grupoActual=computed(()=>grupos.grupos.find(g=>g.id===grupoId.value))
const gruposMap=computed(()=>new Map(grupos.grupos.map(g=>[g.id,g])))
const cantidad=computed(()=>{const a=Number(inicio.value),b=Number(fin.value);return Number.isInteger(a)&&Number.isInteger(b)&&b>=a?b-a+1:0})
const asignados=computed(()=>store.asignaciones.reduce((s,a)=>s+a.cantidad,0))
const normalizarTexto = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const visibles=computed(()=>store.asignaciones.filter(a=>{
  if (filtro.value && a.grupoId !== filtro.value) return false
  const grupo = gruposMap.value.get(a.grupoId)
  const texto = [grupo?.nombre, grupo?.responsable, grupo?.area, formatearNumero(a.inicio), formatearNumero(a.fin)].join(' ')
  return normalizarTexto(texto).includes(normalizarTexto(textoBusqueda.value.trim()))
}))
const conflicto=computed(()=>store.asignaciones.some(a=>Number(inicio.value)<=a.fin&&a.inicio<=Number(fin.value)))
async function cargar(){cargando.value=true;error.value='';try{await Promise.all([grupos.cargar(),store.cargar()])}catch(e){error.value=e.message}finally{cargando.value=false}}
onMounted(cargar)
async function asignar(){error.value='';mensaje.value='';cargando.value=true;try{crearAsignacion({grupoId:grupoId.value,inicio:inicio.value,fin:fin.value,asignaciones:store.asignaciones});await store.asignar({grupoId:grupoId.value,inicio:inicio.value,fin:fin.value});mensaje.value='Asignación registrada correctamente'}catch(e){error.value=e.message}finally{cargando.value=false}}
async function liberar(a){error.value='';mensaje.value='';if(!confirm(`¿Liberar el rango ${formatearNumero(a.inicio)}–${formatearNumero(a.fin)}?`))return;try{await store.eliminar(a.id);mensaje.value='Rango liberado'}catch(e){error.value=e.message}}
async function exportarAsignaciones(){
  error.value=''; mensaje.value=''; cargando.value=true
  try {
    await Promise.all([grupos.cargar(),store.cargar()])
    descargarCsv('control-de-bingo-distribucion.csv', crearReporteDistribucion(visibles.value, grupos.grupos))
    mensaje.value=`CSV descargado: ${visibles.value.length} asignaciones según los filtros actuales.`
  } catch(e) {error.value=e.message || 'No se pudo exportar el CSV'}
  finally {cargando.value=false}
}

</script>
<template>
  <div class="page-header"><div><h1>Distribución de cartones</h1><p>Asignación de rangos a grupos pastorales</p></div><div class="page-actions"><button class="outline-btn" :disabled="cargando" @click="exportarAsignaciones"><AppIcon name="download" :size="16"/> Exportar CSV</button><button class="outline-btn" :disabled="cargando" @click="cargar"><AppIcon name="sun" :size="16"/> Actualizar</button></div></div>
  <div class="stats-grid stats-three"><div class="surface metric-card"><div class="metric-icon blue"><AppIcon name="ticket" :size="25"/></div><div><div class="metric-title">Cartones totales</div><div class="metric-value">3,000</div><div class="metric-note">00001 – 03000</div></div></div><div class="surface metric-card"><div class="metric-icon green"><AppIcon name="users" :size="25"/></div><div><div class="metric-title">Asignados</div><div class="metric-value">{{asignados}}</div><div class="metric-note">{{Math.round(asignados/3000*100)}}% del total</div></div></div><div class="surface metric-card"><div class="metric-icon purple"><AppIcon name="ticket" :size="25"/></div><div><div class="metric-title">Disponibles</div><div class="metric-value">{{3000-asignados}}</div><div class="metric-note">{{Math.round((3000-asignados)/3000*100)}}% del total</div></div></div></div>
  <div v-if="error" class="notice error" role="alert"><AppIcon name="alert"/>{{error}}</div><div v-if="mensaje" class="notice success" role="status"><AppIcon name="check"/>{{mensaje}}</div>
  <div class="section-grid"><section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="ticket"/> Nueva asignación</h2></div><form @submit.prevent="asignar"><div class="field"><label for="grupo">Grupo pastoral *</label><select id="grupo" v-model="grupoId" required><option value="" disabled>Selecciona un grupo</option><option v-for="g in grupos.grupos" :key="g.id" :value="g.id">{{g.nombre}}</option></select></div><div class="field"><label>Responsable</label><input disabled :value="grupoActual?.responsable||'Selecciona primero un grupo'"/></div><div class="form-row"><div class="field"><label for="inicio">Número inicial *</label><input id="inicio" v-model="inicio" maxlength="5" inputmode="numeric" required placeholder="00001"/></div><div class="field"><label for="fin">Número final *</label><input id="fin" v-model="fin" maxlength="5" inputmode="numeric" required placeholder="03000"/></div></div><div class="field"><label>Cantidad</label><input :value="cantidad+' cartones'" disabled/></div><div class="notice" :class="conflicto?'error':''"><AppIcon :name="conflicto?'alert':'info'" :size="19"/><div><strong>{{conflicto?'Rango ocupado':'Validación de numeración'}}</strong><p>{{conflicto?'El rango se superpone con otro ya asignado.':'El sistema comprueba que los rangos no se superpongan.'}}</p></div></div><button type="submit" class="primary-btn full-width" :disabled="cargando||!grupos.grupos.length||conflicto"><AppIcon name="ticket" :size="17"/> Asignar cartones</button></form></section>
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="file"/> Asignaciones registradas</h2><span class="helper">{{visibles.length}} registros</span></div><div class="filters-row"><div class="field"><label for="filtro">Filtrar por grupo</label><select id="filtro" v-model="filtro"><option value="">Todos los grupos</option><option v-for="g in grupos.grupos" :key="g.id" :value="g.id">{{g.nombre}}</option></select></div><div class="field"><label for="buscar-asignacion">Buscar por grupo, responsable o número</label><input id="buscar-asignacion" v-model="textoBusqueda" placeholder="Ej. 00121 o Catequesis" autocomplete="off"/></div></div><div class="table-scroll"><table class="responsive-table"><thead><tr><th>Grupo</th><th>Responsable</th><th>Rango</th><th>Cantidad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="a in visibles" :key="a.id"><td data-label="Grupo"><strong>{{gruposMap.get(a.grupoId)?.nombre||'Grupo no disponible'}}</strong></td><td data-label="Responsable">{{gruposMap.get(a.grupoId)?.responsable||'—'}}</td><td data-label="Rango" style="white-space:nowrap">{{formatearNumero(a.inicio)}} – {{formatearNumero(a.fin)}}</td><td data-label="Cantidad">{{a.cantidad}}</td><td data-label="Estado"><span class="status green">Asignado</span></td><td data-label="Acciones"><button class="danger-btn button-sm" @click="liberar(a)"><AppIcon name="trash" :size="13"/> Liberar</button></td></tr></tbody></table><div v-if="!visibles.length" class="empty-state"><AppIcon name="ticket" :size="30"/><strong>Sin asignaciones</strong><span>Selecciona un grupo y un rango para registrar una asignación.</span></div></div></section></div>
</template>
