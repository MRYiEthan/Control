<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useDistribucionStore } from '@/stores/distribucion'
import { useGruposStore } from '@/stores/grupos'
import { formatearNumero } from '@/domain/distribucion/crearAsignacion'
const route=useRoute(), distribucion=useDistribucionStore(),grupos=useGruposStore()
const numero=ref(String(route.query.numero??'00123')), consultado=ref(''), error=ref(''), cargando=ref(false)
const item=computed(()=>{if(!consultado.value)return null;const v=Number(consultado.value);return distribucion.asignaciones.find(a=>v>=a.inicio&&v<=a.fin)})
const grupo=computed(()=>grupos.grupos.find(g=>g.id===item.value?.grupoId))
const valido=computed(()=>/^[0-9]{1,5}$/.test(consultado.value)&&Number(consultado.value)>=1&&Number(consultado.value)<=3000)
function consultar(){error.value='';const n=String(numero.value).trim();if(!/^[0-9]{1,5}$/.test(n)||+n<1||+n>3000){error.value='Introduce un número válido entre 00001 y 03000';consultado.value='';return}consultado.value=n}
async function cargar(){cargando.value=true;try{await Promise.all([distribucion.cargar(),grupos.cargar()]);consultar()}catch(e){error.value=e.message}finally{cargando.value=false}}
onMounted(cargar)
watch(()=>route.query.numero,value=>{if(value!==undefined){numero.value=String(value);consultar()}})
</script>
<template>
  <div class="page-header"><div><h1>Consulta de cartones</h1><p>Busca un número y verifica su asignación</p></div><span class="tag">00001 – 03000</span></div>
  <div class="section-grid equal" style="align-items:start"><section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="search"/> Consultar numeración</h2></div><p class="muted" style="font-size:13px;line-height:1.65;margin-bottom:22px">La búsqueda se realiza sobre el catálogo de 3,000 cartones y sus asignaciones registradas.</p><form @submit.prevent="consultar"><div class="field"><label for="numero">Número de cartón</label><input id="numero" v-model="numero" inputmode="numeric" maxlength="5" placeholder="Ej. 00123" autocomplete="off"/></div><button class="primary-btn full-width" type="submit"><AppIcon name="search" :size="17"/> Buscar cartón</button></form><div v-if="error" class="notice error" role="alert"><AppIcon name="alert"/>{{error}}</div><div class="notice"><AppIcon name="info" :size="19"/><div><strong>Consulta informativa</strong><p>Muestra únicamente la distribución de cartones. No verifica cobros ni transacciones.</p></div></div></section>
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="ticket"/> Resultado de la consulta</h2><span class="helper">{{cargando?'Actualizando...':'Catálogo'}}</span></div><template v-if="valido"><div class="result-card" style="background:#f4f8ff;border:1px solid #e5efff;border-radius:12px;margin-bottom:13px"><div class="helper">Número consultado</div><div class="lookup-number">#{{formatearNumero(consultado)}}</div><span class="status" :class="item?'green':'gray'">{{item?'Asignado':'Disponible'}}</span></div><div class="result-line"><span>Grupo pastoral</span><strong>{{grupo?.nombre||'No asignado'}}</strong></div><div class="result-line"><span>Responsable</span><strong>{{grupo?.responsable||'—'}}</strong></div><div class="result-line"><span>Área pastoral</span><strong>{{grupo?.area||'—'}}</strong></div><div class="result-line"><span>Rango</span><strong>{{item?`${formatearNumero(item.inicio)} – ${formatearNumero(item.fin)}`:'—'}}</strong></div><div class="result-line"><span>Estado</span><strong>{{item?'Asignación registrada':'Disponible para asignación'}}</strong></div></template><div v-else class="empty-state"><AppIcon name="search" :size="34"/><strong>Escribe un número para consultar</strong><span>Consulta un cartón de la serie del 00001 al 03000.</span></div></section>
  </div>
</template>
