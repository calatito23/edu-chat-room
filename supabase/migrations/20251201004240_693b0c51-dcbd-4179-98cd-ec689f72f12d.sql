-- Crear política para que todos los usuarios autenticados puedan ver los roles de otros usuarios
-- Esto es necesario para mostrar las etiquetas de roles en publicaciones y comentarios
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);