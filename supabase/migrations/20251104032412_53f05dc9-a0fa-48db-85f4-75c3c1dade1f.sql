-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view enrollments in their courses" ON course_enrollments;

-- Create a security definer function to check if a user is enrolled in a course
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM course_enrollments
    WHERE student_id = _user_id
    AND course_id = _course_id
  )
$$;

-- Create a new policy using the security definer function
CREATE POLICY "Users can view enrollments in their courses" 
ON course_enrollments 
FOR SELECT 
USING (
  -- Teachers can see enrollments in their courses
  (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_enrollments.course_id 
    AND courses.teacher_id = auth.uid()
  ))
  OR
  -- Students can see all enrollments in courses where they are enrolled
  public.is_enrolled_in_course(auth.uid(), course_enrollments.course_id)
);