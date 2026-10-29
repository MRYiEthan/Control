# Control de pagos por cartilla

La pantalla Pagos incluye las 3.000 cartillas (00001–03000), búsqueda por número
o grupo, filtros y paginación. Cada cartilla sin registro aparece como Pendiente.
Después de confirmar la recepción del dinero, selecciona la cartilla y el medio
y pulsa Marcar como pagada. Se guarda el número, medio y fecha. No se fija un
precio ni se realizan cobros bancarios.

## Activación con Supabase

1. Ejecutar supabase/pagos.sql en el SQL Editor del proyecto que utiliza la app.
2. Mantener VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.
3. Iniciar sesión y abrir Pagos.
4. Registrar una cartilla, recargar y verificar Pagada. Otra sin registro debe
   mostrar Pendiente. Intentar registrar la primera de nuevo debe rechazarse.

El script es aditivo: no modifica grupos ni asignaciones. La clave primaria evita
duplicados concurrentes y RLS conserva el aislamiento por usuario del proyecto.
Dos cuentas distintas tienen inventarios independientes, igual que la distribución
actual. No usar esto como inventario compartido entre cuentas sin diseñar antes
la pertenencia a un evento/equipo. Un pago pertenece al número, por lo que liberar
o reasignar su rango no lo borra. La columna Grupo actual refleja la distribución
actual, no un historial del grupo que realizó el pago.

Sin configuración Supabase se usa localStorage para una demostración persistente
en un único navegador. No se sincroniza entre dispositivos ni garantiza escritura
simultánea entre pestañas. Un error remoto nunca se sustituye por datos locales.

## Verificación

Ejecutar npm run test:domain y npm run build tras npm ci.
Las pruebas de repositorio usan almacenamiento y cliente simulados; no reemplazan
la prueba con una cuenta en Supabase. En un fallo de carga no se muestran todas
las cartillas como pendientes: se presenta un error y se bloquea el registro.

Validación en este entorno: 19 pruebas de Node aprobadas. Compilación pendiente:
no se pudieron instalar las dependencias de npm (red no disponible y caché incompleta).
La tabla todavía no se ha creado ni probado en el proyecto Supabase del usuario.
