-- Drop the problematic policy
DROP POLICY IF EXISTS "Administrators can view all roles" ON public.user_roles;

-- Create the correct policy using the has_role function
CREATE POLICY "Administrators can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrator')
);