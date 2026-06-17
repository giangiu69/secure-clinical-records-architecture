-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on spr1" ON public.spr1_records;
DROP POLICY IF EXISTS "Allow all operations on spr2" ON public.spr2_records;

-- Create function to check if user email is authorized
CREATE OR REPLACE FUNCTION public.is_authorized_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND email IN ('sibiscencini@gmail.com', 'beatrice.marsella@gmail.com')
  )
$$;

-- SPR1 policies for authorized users only
CREATE POLICY "Authorized users can select spr1"
ON public.spr1_records
FOR SELECT
TO authenticated
USING (public.is_authorized_user());

CREATE POLICY "Authorized users can insert spr1"
ON public.spr1_records
FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_user());

CREATE POLICY "Authorized users can update spr1"
ON public.spr1_records
FOR UPDATE
TO authenticated
USING (public.is_authorized_user())
WITH CHECK (public.is_authorized_user());

CREATE POLICY "Authorized users can delete spr1"
ON public.spr1_records
FOR DELETE
TO authenticated
USING (public.is_authorized_user());

-- SPR2 policies for authorized users only
CREATE POLICY "Authorized users can select spr2"
ON public.spr2_records
FOR SELECT
TO authenticated
USING (public.is_authorized_user());

CREATE POLICY "Authorized users can insert spr2"
ON public.spr2_records
FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_user());

CREATE POLICY "Authorized users can update spr2"
ON public.spr2_records
FOR UPDATE
TO authenticated
USING (public.is_authorized_user())
WITH CHECK (public.is_authorized_user());

CREATE POLICY "Authorized users can delete spr2"
ON public.spr2_records
FOR DELETE
TO authenticated
USING (public.is_authorized_user());