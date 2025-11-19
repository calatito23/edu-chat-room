-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Course members can view all teachers" ON public.course_teachers;

-- Create a security definer function to check if user is a course member
CREATE OR REPLACE FUNCTION public.is_course_member(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user is enrolled as student
  SELECT EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE course_id = _course_id AND student_id = _user_id
  )
  -- Or is assigned as teacher
  OR EXISTS (
    SELECT 1 FROM course_teachers 
    WHERE course_id = _course_id AND teacher_id = _user_id
  )
  -- Or is administrator
  OR has_role(_user_id, 'administrator');
$$;

-- Create new policy using the security definer function
CREATE POLICY "Course members can view all teachers"
ON public.course_teachers
FOR SELECT
USING (public.is_course_member(auth.uid(), course_id));

-- Also update the enrollments policy to use the same approach
DROP POLICY IF EXISTS "Course members can view all enrollments" ON public.course_enrollments;

CREATE POLICY "Course members can view all enrollments"
ON public.course_enrollments
FOR SELECT
USING (public.is_course_member(auth.uid(), course_id));