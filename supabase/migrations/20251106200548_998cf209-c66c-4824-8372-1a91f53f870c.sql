-- Primero, eliminar TODAS las políticas existentes del bucket course-files
DROP POLICY IF EXISTS "Enrolled users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in enrolled courses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete" ON storage.objects;