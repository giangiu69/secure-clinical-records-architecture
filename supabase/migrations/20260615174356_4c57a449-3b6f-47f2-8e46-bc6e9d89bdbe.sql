REVOKE EXECUTE ON FUNCTION public.is_authorized_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized_user() TO authenticated, service_role;