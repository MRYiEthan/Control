<script setup>
import AppIcon from '@/components/AppIcon.vue'
const pagosMuestra=[
  {id:'EX-001',grupo:'Catequesis de Niños',cartones:'00123, 00124, 00125',cantidad:3,medio:'Yape',estado:'En revisión'},
  {id:'EX-002',grupo:'Coro Caridad',cartones:'01005 – 01010',cantidad:6,medio:'Transferencia',estado:'Confirmado'},
  {id:'EX-003',grupo:'Zona Pastoral Belén',cartones:'02011',cantidad:1,medio:'Efectivo',estado:'Confirmado'},
  {id:'EX-004',grupo:'Jóvenes Misioneros',cartones:'02501, 02502',cantidad:2,medio:'Plin',estado:'Rechazado'},
]
const moneda=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n)
</script>
<template>
  <div class="page-header"><div><h1>Vista de pagos</h1><p>Presentación visual de la pantalla aprobada</p></div><span class="tag">SOLO DEMOSTRACIÓN</span></div>
  <div class="notice" style="margin-top:0;margin-bottom:20px"><AppIcon name="info" :size="20"/><div><strong>Diseño ilustrativo, sin transacciones reales</strong><p>Los importes y registros de esta página son exclusivamente de ejemplo. Los controles de cobro y validación real están desactivados.</p></div></div>
  <div class="stats-grid">
    <div class="surface metric-card"><div class="metric-icon blue"><AppIcon name="ticket" :size="25"/></div><div><div class="metric-title">Precio ilustrativo</div><div class="metric-value">S/ 10.00</div><div class="metric-note">Valor del ejercicio</div></div></div>
    <div class="surface metric-card"><div class="metric-icon amber"><AppIcon name="clock" :size="25"/></div><div><div class="metric-title">Ejemplos en revisión</div><div class="metric-value">1</div><div class="metric-note">Datos ficticios</div></div></div>
    <div class="surface metric-card"><div class="metric-icon green"><AppIcon name="check" :size="25"/></div><div><div class="metric-title">Ejemplos confirmados</div><div class="metric-value">2</div><div class="metric-note">Datos ficticios</div></div></div>
    <div class="surface metric-card"><div class="metric-icon purple"><AppIcon name="file" :size="25"/></div><div><div class="metric-title">Operaciones ejemplo</div><div class="metric-value">4</div><div class="metric-note">Sin conexión bancaria</div></div></div>
  </div>
  <div class="section-grid"><section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="credit"/> Formulario ilustrativo</h2><span class="status blue">No disponible</span></div><div class="field"><label>Grupo pastoral</label><input disabled value="Catequesis de Niños"/></div><div class="field"><label>Cartones seleccionados</label><input disabled value="00123, 00124, 00125, 00130"/></div><div class="field"><label>Medio de pago</label><input disabled value="Efectivo · Yape · Plin · Transferencia"/></div><div class="demo-payment-card"><span class="helper">4 cartones × S/ 10.00</span><div class="sum">S/ 40.00</div><span class="helper">Cálculo visual de ejemplo</span></div><button type="button" class="primary-btn full-width" disabled style="margin-top:16px"><AppIcon name="lock" :size="16"/> Registro deshabilitado</button></section>
    <section class="surface surface-pad"><div class="surface-heading"><h2><AppIcon name="shield"/> Acerca de esta pantalla</h2></div><div class="notice"><AppIcon name="info" :size="19"/><div><strong>Vista sin backend de pagos</strong><p>Esta pantalla conserva la apariencia de tu mockup y sirve para evaluar la interfaz con datos ficticios.</p></div></div><div class="result-line"><span>Datos</span><strong>Ejemplos estáticos</strong></div><div class="result-line"><span>Cobros reales</span><strong>No habilitados</strong></div><div class="result-line"><span>Comprobantes</span><strong>No se almacenan</strong></div><div class="result-line"><span>Validaciones reales</span><strong>No habilitadas</strong></div></section></div>
  <section class="surface surface-pad" style="margin-top:19px"><div class="surface-heading"><h2><AppIcon name="file"/> Ejemplos de operaciones</h2><span class="helper">Información ilustrativa</span></div><div class="table-scroll"><table><thead><tr><th>Código</th><th>Grupo</th><th>Cartones</th><th>Total ilustrativo</th><th>Medio</th><th>Estado ficticio</th></tr></thead><tbody><tr v-for="p in pagosMuestra" :key="p.id"><td><strong>{{p.id}}</strong></td><td>{{p.grupo}}</td><td>{{p.cartones}}</td><td>{{moneda(p.cantidad*10)}}</td><td>{{p.medio}}</td><td><span class="status" :class="p.estado==='Confirmado'?'green':p.estado==='En revisión'?'blue':'gray'">{{p.estado}}</span></td></tr></tbody></table></div></section>
</template>
