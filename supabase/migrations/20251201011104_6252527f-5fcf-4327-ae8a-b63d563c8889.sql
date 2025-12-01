-- Permitir a profesores y administradores actualizar respuestas de evaluaciones en sus cursos
CREATE POLICY "Teachers and admins can update evaluation answers"
ON public.evaluation_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM evaluation_submissions es
    JOIN evaluations e ON e.id = es.evaluation_id
    WHERE es.id = evaluation_answers.submission_id
    AND (
      -- Es profesor del curso
      EXISTS (
        SELECT 1 FROM course_teachers ct
        WHERE ct.course_id = e.course_id
        AND ct.teacher_id = auth.uid()
      )
      -- O es administrador
      OR has_role(auth.uid(), 'administrator')
    )
  )
);

-- Permitir a profesores y administradores actualizar submissions de evaluaciones en sus cursos
CREATE POLICY "Teachers and admins can update evaluation submissions"
ON public.evaluation_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    WHERE e.id = evaluation_submissions.evaluation_id
    AND (
      -- Es profesor del curso
      EXISTS (
        SELECT 1 FROM course_teachers ct
        WHERE ct.course_id = e.course_id
        AND ct.teacher_id = auth.uid()
      )
      -- O es administrador
      OR has_role(auth.uid(), 'administrator')
    )
  )
);