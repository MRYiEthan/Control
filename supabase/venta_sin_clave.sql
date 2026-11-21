-- Aplicar después de venta_en_vivo.sql. Conserva el estado del evento y los turnos existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.gestionar_venta_por_enlace(p_accion text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT control_invitados.administrar_venta(p_accion) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION control_invitados.iniciar_venta_por_enlace(p_codigo uuid, p_operador text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  titular uuid;
  turno uuid;
BEGIN
  -- El esquema anterior guarda NULL cuando la venta está cerrada.
  SELECT usuario_id INTO titular FROM control_invitados.enlaces
    WHERE codigo = p_codigo AND clave_venta IS NOT NULL FOR SHARE;
  IF titular IS NULL THEN RAISE insufficient_privilege; END IF;
  INSERT INTO control_invitados.turnos_venta (usuario_id, operador)
    VALUES (titular, control_invitados.nombre_venta(p_operador)) RETURNING token INTO turno;
  RETURN turno;
END;
$$;
CREATE OR REPLACE FUNCTION public.iniciar_venta_por_enlace(p_codigo uuid, p_operador text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT control_invitados.iniciar_venta_por_enlace(p_codigo,p_operador)
$$;
REVOKE ALL ON FUNCTION public.gestionar_venta_por_enlace(text), public.iniciar_venta_por_enlace(uuid,text),
  control_invitados.iniciar_venta_por_enlace(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gestionar_venta_por_enlace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_venta_por_enlace(uuid,text),
  control_invitados.iniciar_venta_por_enlace(uuid,text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
