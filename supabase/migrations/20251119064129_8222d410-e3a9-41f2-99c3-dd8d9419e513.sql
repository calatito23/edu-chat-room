-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Teachers can view their course assignments" ON public.course_teachers;

-- Create new policy allowing all course members to view all teachers in their courses
CREATE POLICY "Course members can view all teachers"
ON public.course_teachers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.course_id = course_teachers.course_id
    AND course_enrollments.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM course_teachers ct
    WHERE ct.course_id = course_teachers.course_id
    AND ct.teacher_id = auth.uid()
  )
  OR has_role(auth.uid(), 'administrator'::user_role)
);

-- Update the enrollment viewing policy to be clearer
DROP POLICY IF EXISTS "Users can view enrollments in their courses" ON public.course_enrollments;

CREATE POLICY "Course members can view all enrollments"
ON public.course_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_teachers
    WHERE course_teachers.course_id = course_enrollments.course_id
    AND course_teachers.teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.course_id = course_enrollments.course_id
    AND ce.student_id = auth.uid()
  )
  OR has_role(auth.uid(), 'administrator'::user_role)
);