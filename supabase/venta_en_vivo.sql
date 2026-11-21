-- Requiere consulta_invitados.sql y pagos_edicion.sql.
BEGIN;

ALTER TABLE control_invitados.enlaces ADD COLUMN IF NOT EXISTS clave_venta text;
ALTER TABLE public.pagos_cartillas ADD COLUMN IF NOT EXISTS registrado_por text;
CREATE TABLE IF NOT EXISTS control_invitados.turnos_venta (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES control_invitados.enlaces(usuario_id) ON DELETE CASCADE,
  operador text NOT NULL
);
CREATE INDEX IF NOT EXISTS turnos_venta_titular ON control_invitados.turnos_venta(usuario_id);
ALTER TABLE control_invitados.turnos_venta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON control_invitados.turnos_venta FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION control_invitados.nombre_venta(valor text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  nombre text := btrim(regexp_replace(normalize(valor, NFC), '[[:space:]]+', ' ', 'g'));
BEGIN
  IF nombre IS NULL OR char_length(nombre) NOT BETWEEN 2 AND 120
    OR nombre COLLATE pg_catalog."und-x-icu" !~ '^[[:alpha:]]+([ ''’-][[:alpha:]]+)*$'
    OR char_length(regexp_replace(nombre, '[ ''’-]', '', 'g')) < 2 THEN
    RAISE EXCEPTION 'Escribe un nombre válido.' USING ERRCODE = '22023';
  END IF;
  RETURN nombre;
END;
$$;

CREATE OR REPLACE FUNCTION control_invitados.administrar_venta(accion text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  titular uuid := auth.uid();
  clave text;
BEGIN
  IF titular IS NULL THEN RAISE insufficient_privilege; END IF;
  CASE accion
    WHEN 'abrir' THEN
      PERFORM control_invitados.mi_codigo();
      UPDATE control_invitados.enlaces SET clave_venta =
        coalesce(clave_venta, left(replace(gen_random_uuid()::text, '-', ''), 12))
        WHERE usuario_id = titular RETURNING clave_venta INTO clave;
    WHEN 'cerrar' THEN
      UPDATE control_invitados.enlaces SET clave_venta = NULL WHERE usuario_id = titular;
      DELETE FROM control_invitados.turnos_venta WHERE usuario_id = titular;
    WHEN 'estado' THEN
      SELECT clave_venta INTO clave FROM control_invitados.enlaces WHERE usuario_id = titular;
    ELSE RAISE invalid_parameter_value;
  END CASE;
  RETURN clave;
END;
$$;

CREATE OR REPLACE FUNCTION control_invitados.iniciar_venta(p_codigo uuid, p_clave text, p_operador text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  titular uuid;
  turno uuid;
BEGIN
  SELECT usuario_id INTO titular FROM control_invitados.enlaces
    WHERE codigo = p_codigo AND clave_venta = lower(btrim(p_clave)) FOR SHARE;
  IF titular IS NULL THEN RAISE insufficient_privilege; END IF;
  INSERT INTO control_invitados.turnos_venta (usuario_id, operador)
    VALUES (titular, control_invitados.nombre_venta(p_operador)) RETURNING token INTO turno;
  RETURN turno;
END;
$$;

CREATE OR REPLACE FUNCTION control_invitados.registrar_venta(
  p_codigo uuid, p_turno uuid, p_numero integer, p_responsable text, p_medio text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  titular uuid;
  nombre_operador text;
BEGIN
  SELECT e.usuario_id, t.operador INTO titular, nombre_operador
    FROM control_invitados.enlaces e JOIN control_invitados.turnos_venta t USING (usuario_id)
    WHERE e.codigo = p_codigo AND e.clave_venta IS NOT NULL AND t.token = p_turno FOR SHARE OF e;
  IF titular IS NULL THEN RAISE insufficient_privilege; END IF;
  IF p_numero IS NULL OR p_numero NOT BETWEEN 1 AND 3000 OR p_medio IS NULL
    OR p_medio NOT IN ('Efectivo', 'Yape', 'Plin', 'Transferencia') THEN RAISE invalid_parameter_value; END IF;
  INSERT INTO public.pagos_cartillas (usuario_id, numero, responsable, medio, registrado_por)
    VALUES (titular, p_numero, control_invitados.nombre_venta(p_responsable), p_medio, nombre_operador);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Esta cartilla ya está pagada.' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.administrar_venta(p_accion text) RETURNS text
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT control_invitados.administrar_venta(p_accion) $$;
CREATE OR REPLACE FUNCTION public.iniciar_venta(p_codigo uuid, p_clave text, p_operador text) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT control_invitados.iniciar_venta(p_codigo,p_clave,p_operador) $$;
CREATE OR REPLACE FUNCTION public.registrar_venta(p_codigo uuid,p_turno uuid,p_numero integer,p_responsable text,p_medio text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT control_invitados.registrar_venta(p_codigo,p_turno,p_numero,p_responsable,p_medio)
$$;

REVOKE ALL ON FUNCTION control_invitados.nombre_venta(text),
  control_invitados.administrar_venta(text), public.administrar_venta(text),
  control_invitados.iniciar_venta(uuid,text,text), public.iniciar_venta(uuid,text,text),
  control_invitados.registrar_venta(uuid,uuid,integer,text,text), public.registrar_venta(uuid,uuid,integer,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.administrar_venta(text), public.administrar_venta(text) TO authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.iniciar_venta(uuid,text,text), public.iniciar_venta(uuid,text,text),
  control_invitados.registrar_venta(uuid,uuid,integer,text,text), public.registrar_venta(uuid,uuid,integer,text,text)
  TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
