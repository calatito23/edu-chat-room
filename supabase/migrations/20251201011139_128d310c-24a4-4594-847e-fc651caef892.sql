-- Eliminar las políticas antiguas que verifican courses.teacher_id (que puede ser null)
-- y que no permiten a profesores asignados en course_teachers actualizar

DROP POLICY IF EXISTS "Teachers can update evaluation answers in their courses" ON public.evaluation_answers;
DROP POLICY IF EXISTS "Teachers can update submissions in their courses" ON public.evaluation_submissions;