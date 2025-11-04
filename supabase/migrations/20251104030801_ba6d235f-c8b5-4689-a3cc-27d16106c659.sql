-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view enrollments in their courses" ON course_enrollments;

-- Create a new policy that allows students to see all enrollments in courses they're enrolled in
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
  (EXISTS (
    SELECT 1 FROM course_enrollments AS ce 
    WHERE ce.course_id = course_enrollments.course_id 
    AND ce.student_id = auth.uid()
  ))
);