CREATE OR REPLACE FUNCTION public.is_authorized_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND email IN (
        'sibiscencini@gmail.com',
        'sibis.cencini@gmail.com',
        'beatrice.marsella@gmail.com'
      )
  )
$$;