-- Allow teachers to update evaluation submissions in their courses
CREATE POLICY "Teachers can update submissions in their courses"
ON public.evaluation_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM evaluations e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = evaluation_submissions.evaluation_id 
    AND c.teacher_id = auth.uid()
  )
);