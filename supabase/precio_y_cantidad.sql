-- Aplicar después de venta_sin_clave.sql.
BEGIN;
ALTER TABLE control_invitados.enlaces ADD COLUMN IF NOT EXISTS precio_centimos integer NOT NULL DEFAULT 1000
  CHECK (precio_centimos BETWEEN 1 AND 99999999);
ALTER TABLE public.pagos_cartillas ADD COLUMN IF NOT EXISTS precio_centimos integer
  CHECK (precio_centimos BETWEEN 1 AND 99999999);

-- Conserva un comprobante incluso si se reintenta la misma solicitud desde el móvil.
CREATE TABLE IF NOT EXISTS control_invitados.ventas_cantidad (
  usuario_id uuid NOT NULL REFERENCES control_invitados.enlaces(usuario_id) ON DELETE CASCADE,
  solicitud uuid NOT NULL,
  turno uuid NOT NULL,
  precio integer NOT NULL,
  numeros integer[] NOT NULL,
  responsable text NOT NULL,
  medio text NOT NULL,
  PRIMARY KEY (usuario_id, solicitud)
);
ALTER TABLE control_invitados.ventas_cantidad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON control_invitados.ventas_cantidad FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION control_invitados.precio_admin(p_precio integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE titular uuid := auth.uid(); vigente integer;
BEGIN
  IF titular IS NULL THEN RAISE insufficient_privilege; END IF;
  IF p_precio IS NULL THEN
    SELECT precio_centimos INTO vigente FROM control_invitados.enlaces WHERE usuario_id=titular;
    RETURN coalesce(vigente,1000);
  END IF;
  IF p_precio NOT BETWEEN 1 AND 99999999 THEN RAISE invalid_parameter_value; END IF;
  PERFORM control_invitados.mi_codigo();
  UPDATE control_invitados.enlaces SET precio_centimos=p_precio WHERE usuario_id=titular;
  RETURN p_precio;
END $$;

-- Los pagos individuales o por rango del panel también conservan el precio vigente al registrarse.
CREATE OR REPLACE FUNCTION control_invitados.sellar_precio_pago()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.precio_centimos := coalesce((SELECT precio_centimos FROM control_invitados.enlaces
    WHERE usuario_id=NEW.usuario_id),1000);
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER sellar_precio_pago BEFORE INSERT ON public.pagos_cartillas
  FOR EACH ROW EXECUTE FUNCTION control_invitados.sellar_precio_pago();

CREATE OR REPLACE FUNCTION control_invitados.precio_turno(p_codigo uuid,p_turno uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT e.precio_centimos FROM control_invitados.enlaces e JOIN control_invitados.turnos_venta t USING(usuario_id)
 WHERE e.codigo=p_codigo AND t.token=p_turno AND e.clave_venta IS NOT NULL
$$;

ALTER TABLE control_invitados.turnos_venta
  ADD COLUMN IF NOT EXISTS siguiente integer,
  ADD COLUMN IF NOT EXISTS ultimo integer;

CREATE OR REPLACE FUNCTION control_invitados.usar_talonario(p_codigo uuid,p_turno uuid,p_desde integer,p_hasta integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE titular uuid;
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde NOT BETWEEN 1 AND 3000
    OR p_hasta NOT BETWEEN p_desde AND 3000 THEN RAISE invalid_parameter_value; END IF;
  SELECT usuario_id INTO titular FROM control_invitados.enlaces
    WHERE codigo=p_codigo AND clave_venta IS NOT NULL FOR UPDATE;
  UPDATE control_invitados.turnos_venta SET siguiente=p_desde, ultimo=p_hasta
    WHERE usuario_id=titular AND token=p_turno;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.usar_talonario(p_codigo uuid,p_turno uuid,p_desde integer,p_hasta integer)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT control_invitados.usar_talonario(p_codigo,p_turno,p_desde,p_hasta)
$$;
REVOKE ALL ON FUNCTION control_invitados.usar_talonario(uuid,uuid,integer,integer),
  public.usar_talonario(uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.usar_talonario(uuid,uuid,integer,integer),
  public.usar_talonario(uuid,uuid,integer,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION control_invitados.vender_cantidad(p_codigo uuid,p_turno uuid,p_solicitud uuid,
  p_desde integer,p_cantidad integer,p_precio integer,p_responsable text,p_medio text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE titular uuid; vigente integer; operador text; nombre text; numeros integer[]; proximo integer; fin integer; ocupada integer;
  previa control_invitados.ventas_cantidad%ROWTYPE;
BEGIN
  SELECT e.usuario_id,e.precio_centimos,t.operador INTO titular,vigente,operador
    FROM control_invitados.enlaces e JOIN control_invitados.turnos_venta t USING(usuario_id)
    WHERE e.codigo=p_codigo AND t.token=p_turno AND e.clave_venta IS NOT NULL FOR UPDATE OF e;
  IF titular IS NULL THEN RAISE insufficient_privilege; END IF;
  IF p_desde IS NULL OR p_desde NOT BETWEEN 1 AND 3000 OR p_solicitud IS NULL OR p_cantidad IS NULL OR p_cantidad NOT BETWEEN 1 AND 3000
    OR p_precio IS NULL OR p_medio IS NULL OR p_medio NOT IN ('Efectivo','Yape','Plin','Transferencia') THEN
    RAISE invalid_parameter_value;
  END IF;
  nombre := control_invitados.nombre_venta(p_responsable);
  SELECT * INTO previa FROM control_invitados.ventas_cantidad WHERE usuario_id=titular AND solicitud=p_solicitud;
  IF FOUND THEN
    IF previa.turno<>p_turno OR previa.numeros[1]<>p_desde OR cardinality(previa.numeros)<>p_cantidad OR previa.responsable<>nombre
      OR previa.medio<>p_medio OR previa.precio<>p_precio THEN RAISE invalid_parameter_value; END IF;
    vigente := previa.precio;
    numeros := previa.numeros;
  ELSE
    IF vigente<>p_precio THEN RETURN jsonb_build_object('estado','precio_cambio','precio',vigente); END IF;
    SELECT siguiente, ultimo INTO proximo, fin FROM control_invitados.turnos_venta WHERE token=p_turno AND usuario_id=titular FOR UPDATE;
    IF proximo IS NULL OR proximo<>p_desde OR p_desde+p_cantidad-1>fin THEN
      RETURN jsonb_build_object('estado','revisar_talonario');
    END IF;
    numeros := ARRAY(SELECT generate_series(p_desde,p_desde+p_cantidad-1));
    BEGIN
      INSERT INTO public.pagos_cartillas(usuario_id,numero,medio,responsable,registrado_por)
        SELECT titular,n,p_medio,nombre,operador FROM unnest(numeros) n;
    EXCEPTION WHEN unique_violation THEN
      SELECT min(p.numero) INTO ocupada FROM public.pagos_cartillas p
        WHERE p.usuario_id=titular AND p.numero=ANY(numeros);
      RETURN jsonb_build_object('estado','cartilla_pagada','numero',ocupada);
    END;
    UPDATE control_invitados.turnos_venta SET siguiente =
      CASE WHEN p_desde+p_cantidad<=fin THEN p_desde+p_cantidad END WHERE token=p_turno;
    INSERT INTO control_invitados.ventas_cantidad(usuario_id,solicitud,turno,precio,numeros,responsable,medio)
      VALUES(titular,p_solicitud,p_turno,vigente,numeros,nombre,p_medio);
  END IF;
  RETURN jsonb_build_object('estado','registrada','numeros',numeros,'precio',vigente,'total',vigente::bigint*p_cantidad);
END $$;

CREATE OR REPLACE FUNCTION public.precio_cartilla_admin(p_precio integer DEFAULT NULL) RETURNS integer
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT control_invitados.precio_admin(p_precio) $$;
CREATE OR REPLACE FUNCTION public.precio_cartilla_turno(p_codigo uuid,p_turno uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT control_invitados.precio_turno(p_codigo,p_turno) $$;
CREATE OR REPLACE FUNCTION public.vender_cartillas(p_codigo uuid,p_turno uuid,p_solicitud uuid,p_desde integer,p_cantidad integer,
  p_precio integer,p_responsable text,p_medio text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 SELECT control_invitados.vender_cantidad(p_codigo,p_turno,p_solicitud,p_desde,p_cantidad,p_precio,p_responsable,p_medio)
$$;
REVOKE ALL ON FUNCTION control_invitados.sellar_precio_pago(),control_invitados.precio_admin(integer),
  public.precio_cartilla_admin(integer),control_invitados.precio_turno(uuid,uuid),public.precio_cartilla_turno(uuid,uuid),
  control_invitados.vender_cantidad(uuid,uuid,uuid,integer,integer,integer,text,text),
  public.vender_cartillas(uuid,uuid,uuid,integer,integer,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.precio_admin(integer),public.precio_cartilla_admin(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION control_invitados.precio_turno(uuid,uuid),public.precio_cartilla_turno(uuid,uuid),
  control_invitados.vender_cantidad(uuid,uuid,uuid,integer,integer,integer,text,text),
  public.vender_cartillas(uuid,uuid,uuid,integer,integer,integer,text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
