-- Eliminar políticas restrictivas anteriores si existen
DROP POLICY IF EXISTS "Course teachers can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Course members can download files" ON storage.objects;
DROP POLICY IF EXISTS "Course teachers can delete files" ON storage.objects;

-- Política para que profesores puedan subir cualquier tipo de archivo
CREATE POLICY "Course teachers can upload any file type"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM courses WHERE teacher_id = auth.uid()
  )
);

-- Política para que todos los miembros del curso puedan descargar
CREATE POLICY "Course members can download any file type"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-files'
  AND can_access_course_files(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Política para que profesores puedan eliminar cualquier archivo
CREATE POLICY "Course teachers can delete any file type"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM courses WHERE teacher_id = auth.uid()
  )
);

-- Actualizar política para UPDATE también
CREATE POLICY "Course teachers can update any file type"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM courses WHERE teacher_id = auth.uid()
  )
);