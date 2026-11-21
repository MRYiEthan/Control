import { mount, flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import VentaEnVivo from '../src/components/VentaEnVivo.vue'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/infrastructure/supabase/supabaseClient', () => ({ supabase: { rpc } }))

it('vende del talonario físico y exige confirmar otra vez si cambia el precio', async () => {
  let precio = 1000
  rpc.mockImplementation(async (nombre, args) => {
    if (nombre === 'iniciar_venta_por_enlace') return { data: 'turno' }
    if (nombre === 'precio_cartilla_turno') return { data: precio }
    if (nombre === 'usar_talonario') return {}
    if (args.p_precio !== precio) return { data: { estado: 'precio_cambio', precio } }
    return { data: { estado: 'registrada', numeros: [121, 122, 123], total: 3 * precio } }
  })
  const pantalla = mount(VentaEnVivo, { props: { codigo: 'enlace' } })
  async function enviar() {
    await pantalla.get('form').trigger('submit')
    await flushPromises()
  }
  await pantalla.get('#operador-venta').setValue('Ana Ruiz')
  await enviar()
  await pantalla.get('#inicio-venta').setValue('00121')
  await pantalla.get('#fin-venta').setValue('00150')
  await enviar()
  await pantalla.get('#cantidad-venta').setValue('3')
  expect(pantalla.text()).toContain('00121–00123')
  expect(pantalla.text()).toMatch(/30[.,]00/)
  await pantalla.get('#responsable-venta').setValue('José Vera')
  await pantalla.get('#medio-venta').setValue('Yape')
  precio = 750
  await enviar()
  expect(pantalla.get('[role="alert"]').text()).toContain('cambió el precio')
  expect(pantalla.text()).toMatch(/22[.,]50/)
  await enviar()
  expect(pantalla.get('[role="status"]').text()).toContain('00121–00123')
  expect(pantalla.text()).toContain('00124–00150')
  expect(sessionStorage.getItem('bingo:venta-pendiente:enlace')).toBeNull()
  pantalla.unmount()
})
