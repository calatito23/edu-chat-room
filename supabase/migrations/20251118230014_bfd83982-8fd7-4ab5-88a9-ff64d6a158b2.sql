-- Add professional_school column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN professional_school TEXT;

-- Update RLS policies to allow users to update their avatar_url and professional_school
-- The existing policy already allows users to update their own profile