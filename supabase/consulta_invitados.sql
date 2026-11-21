-- Cada enlace permite consultar únicamente el inventario de la cuenta que lo creó.
BEGIN;

CREATE SCHEMA IF NOT EXISTS control_invitados;
REVOKE ALL ON SCHEMA control_invitados FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA control_invitados TO anon, authenticated;

CREATE TABLE IF NOT EXISTS control_invitados.enlaces (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
ALTER TABLE control_invitados.enlaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON control_invitados.enlaces FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION control_invitados.mi_codigo()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  titular uuid := auth.uid();
  enlace uuid;
BEGIN
  IF titular IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión' USING ERRCODE = '42501';
  END IF;
  SELECT codigo INTO enlace FROM control_invitados.enlaces WHERE usuario_id = titular;
  IF enlace IS NULL THEN
    INSERT INTO control_invitados.enlaces (usuario_id) VALUES (titular)
      ON CONFLICT (usuario_id) DO NOTHING;
    SELECT codigo INTO STRICT enlace FROM control_invitados.enlaces WHERE usuario_id = titular;
  END IF;
  RETURN enlace;
END;
$$;

-- Un enlace desconocido o un número fuera del catálogo devuelve NULL.
CREATE OR REPLACE FUNCTION control_invitados.estado(p_codigo uuid, p_numero integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pagos_cartillas p
    WHERE p.usuario_id = e.usuario_id AND p.numero = p_numero
  )
  FROM control_invitados.enlaces e
  WHERE e.codigo = p_codigo AND p_numero BETWEEN 1 AND 3000;
$$;

CREATE OR REPLACE FUNCTION public.obtener_enlace_invitado()
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT control_invitados.mi_codigo();
$$;
CREATE OR REPLACE FUNCTION public.consultar_pago_invitado(p_codigo uuid, p_numero integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT control_invitados.estado(p_codigo, p_numero);
$$;

REVOKE ALL ON FUNCTION control_invitados.mi_codigo(), public.obtener_enlace_invitado()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.mi_codigo(), public.obtener_enlace_invitado()
  TO authenticated;
REVOKE ALL ON FUNCTION control_invitados.estado(uuid, integer), public.consultar_pago_invitado(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.estado(uuid, integer), public.consultar_pago_invitado(uuid, integer)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
