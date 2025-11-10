-- Hacer el campo title nullable para permitir publicaciones sin título
ALTER TABLE public.posts 
ALTER COLUMN title DROP NOT NULL;