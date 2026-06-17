
-- 1) audit_logs: revoke direct INSERT from clients; add controlled RPC
DROP POLICY IF EXISTS "Audit insert by self" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _action NOT IN ('vote_cast') THEN
    RAISE EXCEPTION 'action not allowed: %', _action;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, metadata)
  VALUES (auth.uid(), _action, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_audit(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, jsonb) TO authenticated;

-- 2) candidates: nominations default to not-approved
ALTER TABLE public.candidates ALTER COLUMN approved SET DEFAULT false;
ALTER TABLE public.candidates ALTER COLUMN status SET DEFAULT 'pending';

-- 3) candidates: hide reject_reason + internal columns from anon via column-level grants
REVOKE SELECT ON public.candidates FROM anon;
GRANT SELECT (id, full_name, photo_url, manifesto, position_id, status, approved, submitted_at, created_at)
  ON public.candidates TO anon;

-- For authenticated, restrict reject_reason at the column level too. Owner/admin
-- read of reject_reason flows through a dedicated SECURITY DEFINER helper.
REVOKE SELECT ON public.candidates FROM authenticated;
GRANT SELECT (id, full_name, photo_url, manifesto, position_id, status, approved, submitted_at, created_at, user_id)
  ON public.candidates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.candidates TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_candidate_reject_reason(_candidate_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reject_reason
  FROM public.candidates
  WHERE id = _candidate_id
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_candidate_reject_reason(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_candidate_reject_reason(uuid) TO authenticated;

-- 4) Tighten get_election_tallies: only signed-in users can call it
REVOKE EXECUTE ON FUNCTION public.get_election_tallies(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_election_tallies(uuid) TO authenticated;
