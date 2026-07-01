CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _admin_count integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT COUNT(*) INTO _admin_count
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role;

  IF _admin_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'An admin already exists.');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'message', 'You are now the administrator.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_candidates()
RETURNS TABLE (
  id uuid,
  position_id uuid,
  full_name text,
  manifesto text,
  photo_url text,
  approved boolean,
  created_at timestamptz,
  user_id uuid,
  status text,
  reject_reason text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.position_id,
    c.full_name,
    c.manifesto,
    c.photo_url,
    c.approved,
    c.created_at,
    c.user_id,
    c.status,
    c.reject_reason,
    c.submitted_at
  FROM public.candidates c
  ORDER BY c.submitted_at DESC NULLS LAST, c.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_candidates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_candidates() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_candidate_status(
  _candidate_id uuid,
  _approved boolean,
  _reject_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  UPDATE public.candidates
  SET
    approved = _approved,
    status = CASE WHEN _approved THEN 'approved' ELSE 'rejected' END,
    reject_reason = CASE WHEN _approved THEN NULL ELSE NULLIF(btrim(COALESCE(_reject_reason, '')), '') END
  WHERE id = _candidate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidate not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_candidate_status(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_candidate_status(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_candidate(_candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  DELETE FROM public.candidates
  WHERE id = _candidate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidate not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_candidate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_candidate(uuid) TO authenticated;