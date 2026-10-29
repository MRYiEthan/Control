-- Ejecutar en el SQL Editor del mismo proyecto configurado en .env.
-- Registro manual del pago recibido; no realiza cobros bancarios.
-- Conserva el aislamiento por usuario utilizado por grupos y asignaciones.
BEGIN;
CREATE TABLE IF NOT EXISTS public.pagos_cartillas (
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  numero integer NOT NULL CHECK (numero BETWEEN 1 AND 3000),
  medio text NOT NULL CHECK (medio IN ('Efectivo', 'Yape', 'Plin', 'Transferencia')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, numero)
);
ALTER TABLE public.pagos_cartillas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pagos_cartillas FROM anon, authenticated;
GRANT SELECT ON public.pagos_cartillas TO authenticated;
GRANT INSERT (numero, medio) ON public.pagos_cartillas TO authenticated;
DROP POLICY IF EXISTS "Consultar mis pagos" ON public.pagos_cartillas;
CREATE POLICY "Consultar mis pagos" ON public.pagos_cartillas
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = usuario_id);
DROP POLICY IF EXISTS "Registrar mis pagos" ON public.pagos_cartillas;
CREATE POLICY "Registrar mis pagos" ON public.pagos_cartillas
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = usuario_id);
COMMIT;
