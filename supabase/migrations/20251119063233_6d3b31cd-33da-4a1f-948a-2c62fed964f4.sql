-- Update the enrollment notification trigger to use created_by instead of teacher_id
CREATE OR REPLACE FUNCTION public.notify_course_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title TEXT;
  course_creator UUID;
BEGIN
  SELECT title, created_by INTO course_title, course_creator
  FROM courses
  WHERE id = NEW.course_id;
  
  PERFORM create_notification(
    NEW.student_id,
    course_creator,
    'enrollment',
    'Agregado a curso',
    'Has sido agregado al curso: ' || course_title,
    '/courses/' || NEW.course_id
  );
  RETURN NEW;
END;
$function$;