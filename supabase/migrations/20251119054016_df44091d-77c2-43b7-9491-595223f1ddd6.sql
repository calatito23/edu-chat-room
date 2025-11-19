
-- Arreglar el trigger de notificación de desinscripción
DROP FUNCTION IF EXISTS public.notify_course_unenrollment() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_course_unenrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  course_title TEXT;
  course_teacher_id UUID;
BEGIN
  SELECT c.title, c.teacher_id INTO course_title, course_teacher_id
  FROM courses c
  WHERE c.id = OLD.course_id;
  
  PERFORM create_notification(
    OLD.student_id,
    course_teacher_id,
    'unenrollment',
    'Removido de curso',
    'Has sido removido del curso: ' || course_title,
    '/dashboard'
  );
  RETURN OLD;
END;
$function$;

-- Recrear el trigger
CREATE TRIGGER on_course_unenrollment
  AFTER DELETE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_course_unenrollment();
