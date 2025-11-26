-- Create trigger function to notify teachers when removed from a course
CREATE OR REPLACE FUNCTION public.notify_teacher_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title TEXT;
BEGIN
  -- Get course title
  SELECT title INTO course_title
  FROM courses
  WHERE id = OLD.course_id;
  
  -- Only create notification if course still exists
  IF course_title IS NOT NULL THEN
    PERFORM create_notification(
      OLD.teacher_id,
      OLD.assigned_by,
      'teacher_removal',
      'Removido de curso',
      'Has sido removido como profesor del curso: ' || course_title,
      '/dashboard'
    );
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Create trigger on course_teachers table for deletion
CREATE TRIGGER on_teacher_removed
  AFTER DELETE ON course_teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_teacher_removal();