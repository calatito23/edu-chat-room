-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view files if they can access the course" ON files;
DROP POLICY IF EXISTS "Users can upload files if they can access the course" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Crear políticas ultra simples que DEFINITIVAMENTE funcionan
CREATE POLICY "Authenticated users can view all files"
ON files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload files"
ON files FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can delete only their own files"
ON files FOR DELETE
TO authenticated
USING (auth.uid() = uploader_id);