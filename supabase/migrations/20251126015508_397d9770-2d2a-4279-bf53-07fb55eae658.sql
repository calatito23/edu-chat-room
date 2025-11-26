-- Create trigger function to notify teachers when assigned to a course
CREATE OR REPLACE FUNCTION public.notify_teacher_assignment()
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
  WHERE id = NEW.course_id;
  
  -- Create notification for the assigned teacher
  PERFORM create_notification(
    NEW.teacher_id,
    NEW.assigned_by,
    'teacher_assignment',
    'Asignado a curso',
    'Has sido asignado como profesor al curso: ' || course_title,
    '/courses/' || NEW.course_id
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger on course_teachers table
CREATE TRIGGER on_teacher_assigned
  AFTER INSERT ON course_teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_teacher_assignment();