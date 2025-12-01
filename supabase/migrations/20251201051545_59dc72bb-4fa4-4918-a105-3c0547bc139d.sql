-- Actualizar función can_access_course_files para incluir course_teachers y administrators
CREATE OR REPLACE FUNCTION public.can_access_course_files(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Profesor asignado en la tabla courses (legacy)
    SELECT 1 FROM courses WHERE id = _course_id AND teacher_id = _user_id
  ) OR EXISTS (
    -- Estudiante matriculado
    SELECT 1 FROM course_enrollments WHERE course_id = _course_id AND student_id = _user_id
  ) OR EXISTS (
    -- Profesor asignado en course_teachers
    SELECT 1 FROM course_teachers WHERE course_id = _course_id AND teacher_id = _user_id
  ) OR EXISTS (
    -- Administrador
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'administrator'
  );
$$;

-- Actualizar políticas de storage para course-files
DROP POLICY IF EXISTS "Course teachers can delete any file type" ON storage.objects;
CREATE POLICY "Course teachers can delete any file type"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND (
    -- Teacher legacy
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
    OR
    -- Teacher in course_teachers
    (storage.foldername(name))[1]::uuid IN (
      SELECT course_id FROM course_teachers WHERE teacher_id = auth.uid()
    )
    OR
    -- Administrator
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrator')
  )
);

DROP POLICY IF EXISTS "Course teachers can update any file type" ON storage.objects;
CREATE POLICY "Course teachers can update any file type"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND (
    -- Teacher legacy
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
    OR
    -- Teacher in course_teachers
    (storage.foldername(name))[1]::uuid IN (
      SELECT course_id FROM course_teachers WHERE teacher_id = auth.uid()
    )
    OR
    -- Administrator
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrator')
  )
);

DROP POLICY IF EXISTS "Course teachers can upload any file type" ON storage.objects;
CREATE POLICY "Course teachers can upload any file type"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
  AND (
    -- Teacher legacy
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
    OR
    -- Teacher in course_teachers
    (storage.foldername(name))[1]::uuid IN (
      SELECT course_id FROM course_teachers WHERE teacher_id = auth.uid()
    )
    OR
    -- Administrator
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrator')
  )
);