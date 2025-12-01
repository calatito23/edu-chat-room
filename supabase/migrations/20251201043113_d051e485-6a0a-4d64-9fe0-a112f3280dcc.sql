-- Add images column to evaluation_questions table
ALTER TABLE public.evaluation_questions 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT NULL;