CREATE OR REPLACE FUNCTION public.get_election_tallies(_election_id uuid)
RETURNS TABLE (position_id uuid, candidate_id uuid, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.position_id, v.candidate_id, COUNT(*)::bigint
  FROM public.votes v
  JOIN public.elections e ON e.id = v.election_id
  WHERE v.election_id = _election_id
    AND (e.results_published = true OR public.has_role(auth.uid(), 'admin'))
  GROUP BY v.position_id, v.candidate_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_election_tallies(uuid) TO anon, authenticated;