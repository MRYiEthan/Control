<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ResumenPagos from '@/components/ResumenPagos.vue'
import { usePagosStore } from '@/stores/pagos'
import AppIcon from '@/components/AppIcon.vue'
import { useGruposStore } from '@/stores/grupos'
import { useDistribucionStore } from '@/stores/distribucion'
import { formatearNumero } from '@/domain/distribucion/crearAsignacion'
const grupos=useGruposStore(), distribucion=useDistribucionStore()
const pagos=usePagosStore(), errorPagos=ref('')
const error=ref(''), cargando=ref(false)
async function cargar(){cargando.value=true;error.value='';errorPagos.value='';try{await Promise.all([grupos.cargar(),distribucion.cargar(),pagos.cargar().catch(e=>{errorPagos.value=e.message})])}catch(e){error.value=e.message}finally{cargando.value=false}}
onMounted(cargar)
const total=3000
const asignados=computed(()=>distribucion.asignaciones.reduce((sum,a)=>sum+a.cantidad,0))
const disponibles=computed(()=>total-asignados.value)
const proporcion=computed(()=>Math.round(asignados.value/total*100))
const conAsignacion=computed(()=>new Set(distribucion.asignaciones.map(a=>a.grupoId)).size)
const mapaGrupos=computed(()=>new Map(grupos.grupos.map(g=>[g.id,g])))
const areas=computed(()=>{
  const sums={}
  for (const a of distribucion.asignaciones){const area=mapaGrupos.value.get(a.grupoId)?.area||'Sin área';sums[area]=(sums[area]||0)+a.cantidad}
  return Object.entries(sums).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([nombre,cantidad])=>({nombre,cantidad}))
})
const maxArea=computed(()=>Math.max(1,...areas.value.map(x=>x.cantidad)))
const reciente=computed(()=>[...distribucion.asignaciones].sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')).slice(0,5))
</script>
<template>
  <div class="page-header"><div><h1>Dashboard</h1><p>Resumen general de cartones y grupos</p></div><div class="page-actions"><span class="tag">Catálogo · 00001–03000</span><button class="outline-btn" :disabled="cargando" @click="cargar"><AppIcon name="sun" :size="16"/>Actualizar</button></div></div>
  <div v-if="error" class="notice error" role="alert"><AppIcon name="alert"/>{{error}}</div>
  <ResumenPagos :pagadas="pagos.pagos.length" :total="total" :cargando="cargando" :listo="pagos.listo" :error="errorPagos" />
  <div class="stats-grid">
    <div class="surface metric-card"><div class="metric-icon blue"><AppIcon name="ticket" :size="25"/></div><div><div class="metric-title">Total cartones</div><div class="metric-value">3,000</div><div class="metric-note">00001 – 03000</div></div></div>
    <div class="surface metric-card"><div class="metric-icon green"><AppIcon name="users" :size="25"/></div><div><div class="metric-title">Asignados</div><div class="metric-value">{{asignados.toLocaleString('es-PE')}}</div><div class="metric-note">{{proporcion}}% del catálogo</div></div></div>
    <div class="surface metric-card"><div class="metric-icon purple"><AppIcon name="ticket" :size="25"/></div><div><div class="metric-title">Disponibles</div><div class="metric-value">{{disponibles.toLocaleString('es-PE')}}</div><div class="metric-note">Sin asignar</div></div></div>
    <div class="surface metric-card"><div class="metric-icon amber"><AppIcon name="users" :size="25"/></div><div><div class="metric-title">Grupos</div><div class="metric-value">{{grupos.grupos.length}}</div><div class="metric-note">{{conAsignacion}} con asignación</div></div></div>
  </div>
  <div class="section-grid equal" style="margin-bottom:19px">
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="chart"/> Avance de distribución</h2><RouterLink class="link-button" to="/distribucion">Ver detalles →</RouterLink></div><div class="stat-highlight"><div class="helper">Cartones asignados</div><strong>{{proporcion}}%</strong><p class="muted" style="font-size:12px;margin:6px 0 15px">{{asignados}} de {{total}} cartones distribuidos</p><div class="meter"><div :style="{width:proporcion+'%'}"></div></div></div><div style="display:flex;justify-content:space-between;gap:12px;margin-top:15px;font-size:12px;color:#7990ab"><span>Asignados: <b style="color:#1b72df">{{asignados}}</b></span><span>Disponibles: <b style="color:#243b60">{{disponibles}}</b></span></div></section>
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="users"/> Grupos y responsables</h2><RouterLink class="link-button" to="/grupos">Administrar →</RouterLink></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px"><div class="stat-highlight"><div class="helper">Total registrados</div><strong>{{grupos.grupos.length}}</strong></div><div class="stat-highlight"><div class="helper">Sin asignación</div><strong>{{Math.max(0,grupos.grupos.length-conAsignacion)}}</strong></div></div><p class="helper" style="margin:17px 0 0">Los grupos se administran con el CRUD existente de Supabase o modo local.</p></section>
  </div>
  <div class="section-grid equal" style="margin-bottom:19px">
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="chart"/> Distribución por áreas</h2><span class="helper">Cartones</span></div><template v-if="areas.length"><div class="chart-bars"><div class="bar-item" v-for="item in areas" :key="item.nombre"><strong style="font-size:12px;color:#24466b">{{item.cantidad}}</strong><div class="bar-column" :style="{height:(item.cantidad/maxArea*175)+'px'}"></div></div></div><div class="chart-labels"><span v-for="item in areas" :key="item.nombre">{{item.nombre}}</span></div></template><div v-else class="empty-state"><AppIcon name="chart" :size="28"/><strong>Sin información de áreas</strong><span>Las gráficas aparecerán al crear asignaciones.</span></div></section>
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="clock"/> Actividad reciente</h2><RouterLink class="link-button" to="/distribucion">Ver todas →</RouterLink></div><div v-if="!reciente.length" class="empty-state"><AppIcon name="clock" :size="28"/><strong>No hay movimientos recientes</strong><span>Registra una asignación para comenzar.</span></div><div class="activity-item" v-for="a in reciente" :key="a.id"><span class="activity-icon"><AppIcon name="ticket" :size="18"/></span><div style="flex:1"><strong>{{mapaGrupos.get(a.grupoId)?.nombre||'Grupo no disponible'}}</strong><p>Rango {{formatearNumero(a.inicio)}} – {{formatearNumero(a.fin)}} asignado</p></div><span class="tag">{{a.cantidad}}</span></div></section>
  </div>
  <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="file"/> Últimas asignaciones</h2><RouterLink class="link-button" to="/consulta">Consultar cartón →</RouterLink></div><div class="table-scroll"><table class="responsive-table"><thead><tr><th>Grupo</th><th>Área</th><th>Rango</th><th>Cantidad</th><th>Estado</th></tr></thead><tbody><tr v-for="a in reciente" :key="a.id"><td data-label="Grupo"><strong>{{mapaGrupos.get(a.grupoId)?.nombre||'Grupo no disponible'}}</strong></td><td data-label="Área">{{mapaGrupos.get(a.grupoId)?.area||'—'}}</td><td data-label="Rango">{{formatearNumero(a.inicio)}} – {{formatearNumero(a.fin)}}</td><td data-label="Cantidad">{{a.cantidad}}</td><td data-label="Estado"><span class="status green">Asignado</span></td></tr></tbody></table><div v-if="!reciente.length" class="empty-state">{{cargando?'Cargando información...':'Aún no hay asignaciones registradas.'}}</div></div></section>
</template>
