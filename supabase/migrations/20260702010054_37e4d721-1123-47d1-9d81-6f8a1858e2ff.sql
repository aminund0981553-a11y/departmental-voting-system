
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elections TO authenticated;
GRANT SELECT ON public.elections TO anon;
GRANT ALL ON public.elections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;
GRANT SELECT ON public.positions TO anon;
GRANT ALL ON public.positions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT ON public.candidates TO anon;
GRANT ALL ON public.candidates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
