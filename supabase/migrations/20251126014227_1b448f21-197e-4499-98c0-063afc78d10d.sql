-- Fix the notify_course_unenrollment trigger to handle course deletion
CREATE OR REPLACE FUNCTION public.notify_course_unenrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title TEXT;
  course_teacher_id UUID;
BEGIN
  -- Try to get course information
  SELECT c.title, c.created_by INTO course_title, course_teacher_id
  FROM courses c
  WHERE c.id = OLD.course_id;
  
  -- Only create notification if course still exists
  -- This prevents errors when course is being deleted (CASCADE)
  IF course_title IS NOT NULL THEN
    PERFORM create_notification(
      OLD.student_id,
      course_teacher_id,
      'unenrollment',
      'Removido de curso',
      'Has sido removido del curso: ' || course_title,
      '/dashboard'
    );
  END IF;
  
  RETURN OLD;
END;
$function$;