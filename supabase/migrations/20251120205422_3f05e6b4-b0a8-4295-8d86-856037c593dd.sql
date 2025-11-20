-- Arreglar políticas RLS para permitir a profesores eliminar archivos y ver entregas de evaluaciones

-- 1. Arreglar políticas de files para eliminación
DROP POLICY IF EXISTS "Administrators and assigned teachers can delete files" ON public.files;
DROP POLICY IF EXISTS "Uploaders can delete their files" ON public.files;

-- Permitir eliminación para administradores, profesores del curso, o el uploader
CREATE POLICY "Course members with teacher role can delete files"
ON public.files
FOR DELETE
USING (
  public.has_role(auth.uid(), 'administrator') OR
  (public.is_course_member(auth.uid(), course_id) AND 
   (public.has_role(auth.uid(), 'teacher') OR auth.uid() = uploader_id))
);

-- 2. Arreglar políticas de evaluation_submissions para SELECT
DROP POLICY IF EXISTS "Teachers can view all submissions" ON public.evaluation_submissions;
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.evaluation_submissions;

CREATE POLICY "Students can view their own submissions"
ON public.evaluation_submissions
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can view course submissions"
ON public.evaluation_submissions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'administrator')
);

-- 3. Arreglar políticas de evaluation_answers para SELECT
DROP POLICY IF EXISTS "Teachers can view all answers" ON public.evaluation_answers;
DROP POLICY IF EXISTS "Students can view their own answers" ON public.evaluation_answers;

CREATE POLICY "Students can view their own answers"
ON public.evaluation_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM evaluation_submissions
    WHERE evaluation_submissions.id = evaluation_answers.submission_id
    AND evaluation_submissions.student_id = auth.uid()
  )
);

CREATE POLICY "Teachers and admins can view all answers"
ON public.evaluation_answers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'administrator')
);