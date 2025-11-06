-- Hacer el bucket público temporalmente para solucionar el problema
UPDATE storage.buckets 
SET public = true 
WHERE id = 'course-files';