# Corrección de pagos

Aplicar editar-pagos.patch sobre la versión que ya tiene control-pagos.patch.
Ejecutar supabase/pagos_edicion.sql una vez en el SQL Editor del mismo proyecto.
No volver a ejecutar pagos.sql después: ese script inicial restablece permisos.

En Pagos se requiere el nombre del responsable del pago (persona responsable,
no necesariamente el usuario que opera la aplicación). Los registros anteriores
se conservan y muestran Sin registrar hasta que se complete su responsable.

Editar permite corregir medio, responsable y número. Un cambio de número mueve
el registro de forma atómica en Supabase: la anterior queda Pendiente; la nueva,
Pagada. Si el destino ya está pagado, se rechaza sin modificar el origen.

Devolver a pendiente solicita confirmación y elimina el registro de pago.
No devuelve dinero ni conserva un historial de anulaciones.
Cancelar edición descarta los cambios del formulario.

Comprobar: registrar, recargar, editar responsable/medio, cambiar número a uno
pendiente, intentar cambiarlo a uno pagado y finalmente devolverlo a pendiente.
Verificar los estados y contadores después de recargar.
Los pagos continúan separados por usuario como el resto del proyecto.
