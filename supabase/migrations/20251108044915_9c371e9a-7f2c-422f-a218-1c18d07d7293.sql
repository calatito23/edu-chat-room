-- Crear función para verificar si un usuario puede acceder a archivos de un curso
CREATE OR REPLACE FUNCTION public.can_access_course_files(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses WHERE id = _course_id AND teacher_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM course_enrollments WHERE course_id = _course_id AND student_id = _user_id
  );
$$;

-- Eliminar políticas existentes de la tabla files
DROP POLICY IF EXISTS "Users can view files in enrolled courses" ON files;
DROP POLICY IF EXISTS "Enrolled users can upload files" ON files;
DROP POLICY IF EXISTS "Uploaders can delete their files" ON files;

-- Crear nuevas políticas simplificadas
CREATE POLICY "Users can view files if they can access the course"
ON files FOR SELECT
USING (public.can_access_course_files(auth.uid(), course_id));

CREATE POLICY "Users can upload files if they can access the course"
ON files FOR INSERT
WITH CHECK (
  public.can_access_course_files(auth.uid(), course_id) 
  AND auth.uid() = uploader_id
);

CREATE POLICY "Users can delete their own files"
ON files FOR DELETE
USING (auth.uid() = uploader_id);