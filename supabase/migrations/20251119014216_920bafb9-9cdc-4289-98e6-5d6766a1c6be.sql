-- Fix infinite recursion in courses table RLS policies
-- Remove the redundant and problematic policy
DROP POLICY IF EXISTS "Teachers can view their assigned courses" ON public.courses;

-- The "Anyone can view courses" policy with 'true' is sufficient for SELECT
-- Keep only the clean, simple policies