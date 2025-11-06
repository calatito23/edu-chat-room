-- Crear políticas con el cast correcto
CREATE POLICY "Allow authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "Allow public select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-files');

CREATE POLICY "Allow owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-files' AND ((auth.uid())::text = owner_id));