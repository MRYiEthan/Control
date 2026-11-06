# Pago por unidad y en bloque

En Control de pagos, elige el Tipo de pago:

- Por unidad: para ventas en la parroquia. Ingresa un solo número de cartilla, el medio de pago y el responsable.
- En bloque: para grupos. Ingresa Desde y Hasta. Se incluyen todas las cartillas consecutivas entre esos números. Por ejemplo, 00010 a 00025 paga 16 cartillas con un solo botón.

Por unidad es la opción inicial. Al seleccionar una cartilla del inventario se activa esa opción. La edición de pagos existentes continúa siendo individual.

Se mantiene el control de duplicados. Si un bloque contiene una cartilla pagada, hay que ajustar el rango; no se registran pagos parciales ni se sobrescriben pagos anteriores.

No se requieren nuevas dependencias ni cambios en la base de datos respecto al proyecto original con pagos y responsables ya configurados.

Verificación: node --test tests/*.test.js. Incluye pruebas de las acciones del formulario con estado simulado; no sustituye una revisión visual del navegador ni una prueba de conexión real a Supabase.
