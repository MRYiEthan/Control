import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'
import GruposView from '@/views/GruposView.vue'
import LoginView from '@/views/LoginView.vue'
import DistribucionView from '@/views/DistribucionView.vue'
import PagosView from '@/views/PagosView.vue'
import ConsultaView from '@/views/ConsultaView.vue'
const router=createRouter({history:createWebHashHistory(),routes:[
  {path:'/login',name:'login',component:LoginView},
  {path:'/',name:'home',component:HomeView,meta:{requiereAuth:true}},
  {path:'/grupos',name:'grupos',component:GruposView,meta:{requiereAuth:true}},
  {path:'/distribucion',name:'distribucion',component:DistribucionView,meta:{requiereAuth:true}},
  {path:'/pagos',name:'pagos',component:PagosView,meta:{requiereAuth:true}},
  {path:'/consulta',name:'consulta',component:ConsultaView,meta:{requiereAuth:true}},
  {path:'/:pathMatch(.*)*',redirect:'/'},
]})
router.beforeEach(async to=>{
  const auth=useAuthStore()
  try{await auth.inicializar()}catch(e){console.error('No se pudo verificar la sesión',e);if(to.name!=='login')return {name:'login'};return true}
  if(to.meta.requiereAuth&&!auth.usuario)return {name:'login'}
  if(to.name==='login'&&auth.usuario)return {name:'home'}
})
export default router
