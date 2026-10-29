-- Solo para DEMOSTRACIÓN ACADÉMICA de distribución de cartones, no pagos reales.
-- Requiere la tabla public.grupos_demo existente con columna usuario_id uuid y RLS.
-- Ejecutar una sola vez desde Supabase SQL Editor como propietario del proyecto.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS public.asignaciones_demo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  grupo_id uuid NOT NULL REFERENCES public.grupos_demo(id) ON DELETE RESTRICT,
  inicio integer NOT NULL CHECK (inicio BETWEEN 1 AND 3000),
  fin integer NOT NULL CHECK (fin BETWEEN inicio AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asignaciones_demo_sin_solapamiento EXCLUDE USING gist (
    usuario_id WITH =,
    int4range(inicio, fin, '[]') WITH &&
  )
);
ALTER TABLE public.asignaciones_demo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asignaciones_demo FROM anon,authenticated;
GRANT SELECT, INSERT, DELETE ON public.asignaciones_demo TO authenticated;
DROP POLICY IF EXISTS "Ver mis asignaciones demo" ON public.asignaciones_demo;
DROP POLICY IF EXISTS "Crear mis asignaciones demo" ON public.asignaciones_demo;
DROP POLICY IF EXISTS "Eliminar mis asignaciones demo" ON public.asignaciones_demo;
CREATE POLICY "Ver mis asignaciones demo" ON public.asignaciones_demo FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = usuario_id);
CREATE POLICY "Crear mis asignaciones demo" ON public.asignaciones_demo FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = usuario_id AND EXISTS (
      SELECT 1 FROM public.grupos_demo g WHERE g.id = grupo_id AND g.usuario_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Eliminar mis asignaciones demo" ON public.asignaciones_demo FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = usuario_id);
-- Evita asignar rangos solapados incluso con dos solicitudes concurrentes.
-- No ingresar información privada ni credenciales en esta consulta SQL.
