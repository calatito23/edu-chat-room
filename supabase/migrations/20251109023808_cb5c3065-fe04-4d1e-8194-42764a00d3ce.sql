-- Eliminar políticas actuales de la tabla files
DROP POLICY IF EXISTS "Authenticated users can upload files" ON files;
DROP POLICY IF EXISTS "Authenticated users can view all files" ON files;
DROP POLICY IF EXISTS "Users can delete only their own files" ON files;

-- Política: Solo profesores del curso pueden subir archivos
CREATE POLICY "Only course teachers can upload files"
ON files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = files.course_id
    AND courses.teacher_id = auth.uid()
  )
  AND auth.uid() = uploader_id
);

-- Política: Usuarios del curso pueden ver archivos
CREATE POLICY "Course members can view files"
ON files
FOR SELECT
USING (
  can_access_course_files(auth.uid(), course_id)
);

-- Política: Profesores del curso pueden eliminar cualquier archivo de su curso
CREATE POLICY "Course teachers can delete any file"
ON files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = files.course_id
    AND courses.teacher_id = auth.uid()
  )
);