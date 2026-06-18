
DROP POLICY IF EXISTS "Candidate photos are publicly readable" ON storage.objects;
CREATE POLICY "Authenticated can read candidate photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'candidate-photos');

REVOKE SELECT ON public.candidates FROM anon;
GRANT SELECT (id, position_id, user_id, full_name, manifesto, photo_url, status, approved, submitted_at, created_at)
  ON public.candidates TO anon;
