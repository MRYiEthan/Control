# Pagos por rango de cartillas

En Control de pagos, ingresa Desde y Hasta (ambos incluidos), el medio de pago y el responsable. Por ejemplo, desde 00010 hasta 00025 registra 16 cartillas con un solo botón.

El formulario muestra la cantidad antes de guardar. Los números deben estar entre 00001 y 03000. Para pagar una sola cartilla, repite el número en ambos campos.

Si una cartilla del rango ya está pagada, se rechaza todo el rango. Ajusta los extremos para seleccionar un rango pendiente. Los pagos previos no se sobrescriben. Se conserva la edición y devolución a pendiente por cartilla.

El guardado usa una sola escritura local o una sola inserción en Supabase; no necesita nuevas tablas ni cambios de permisos. Para instalaciones nuevas siguen siendo necesarios los scripts existentes supabase/pagos.sql y supabase/pagos_edicion.sql, en ese orden. Los informes y contadores conservan el detalle por cartilla.

Pruebas: node --test tests/*.test.js. Las pruebas remotas usan un cliente simulado; no se han ejecutado contra una base de datos real.
