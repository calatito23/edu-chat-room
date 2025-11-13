-- Allow teachers to update evaluation answers for their courses
CREATE POLICY "Teachers can update evaluation answers in their courses"
ON public.evaluation_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM evaluation_submissions es
    JOIN evaluations e ON e.id = es.evaluation_id
    JOIN courses c ON c.id = e.course_id
    WHERE es.id = evaluation_answers.submission_id 
    AND c.teacher_id = auth.uid()
  )
);