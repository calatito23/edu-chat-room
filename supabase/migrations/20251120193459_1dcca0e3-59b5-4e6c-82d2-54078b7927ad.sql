-- Fix RLS policies for evaluation_questions to allow teachers to insert questions

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage questions" ON public.evaluation_questions;
DROP POLICY IF EXISTS "Course members can view questions" ON public.evaluation_questions;

-- Create new comprehensive policies
CREATE POLICY "Course members can view questions"
ON public.evaluation_questions
FOR SELECT
USING (
  public.is_course_member(
    auth.uid(), 
    (SELECT course_id FROM evaluations WHERE id = evaluation_questions.evaluation_id)
  )
);

CREATE POLICY "Teachers and admins can insert questions"
ON public.evaluation_questions
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Teachers and admins can update questions"
ON public.evaluation_questions
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Teachers and admins can delete questions"
ON public.evaluation_questions
FOR DELETE
USING (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'administrator')
);