
REVOKE UPDATE ON public.candidates FROM authenticated;
GRANT UPDATE (full_name, manifesto, photo_url, position_id) ON public.candidates TO authenticated;

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
