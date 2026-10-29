-- Ejecutar DESPUÉS de pagos.sql. Conserva los pagos existentes.
BEGIN;
ALTER TABLE public.pagos_cartillas
  ADD COLUMN IF NOT EXISTS responsable text
  CHECK (responsable IS NULL OR char_length(btrim(responsable)) BETWEEN 1 AND 120);
GRANT INSERT (responsable) ON public.pagos_cartillas TO authenticated;
GRANT UPDATE (numero, medio, responsable) ON public.pagos_cartillas TO authenticated;
GRANT DELETE ON public.pagos_cartillas TO authenticated;
DROP POLICY IF EXISTS "Registrar mis pagos" ON public.pagos_cartillas;
CREATE POLICY "Registrar mis pagos" ON public.pagos_cartillas
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) = usuario_id AND responsable IS NOT NULL
    AND char_length(btrim(responsable)) BETWEEN 1 AND 120
  );
DROP POLICY IF EXISTS "Editar mis pagos" ON public.pagos_cartillas;
CREATE POLICY "Editar mis pagos" ON public.pagos_cartillas
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = usuario_id)
  WITH CHECK (
    (SELECT auth.uid()) = usuario_id AND responsable IS NOT NULL
    AND char_length(btrim(responsable)) BETWEEN 1 AND 120
  );
DROP POLICY IF EXISTS "Eliminar mis pagos" ON public.pagos_cartillas;
CREATE POLICY "Eliminar mis pagos" ON public.pagos_cartillas
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = usuario_id);
COMMIT;
