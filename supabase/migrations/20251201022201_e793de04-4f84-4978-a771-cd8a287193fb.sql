-- Función para notificar sobre nuevas reuniones de Zoom
CREATE OR REPLACE FUNCTION public.notify_new_zoom_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_member RECORD;
  course_title TEXT;
  creator_name TEXT;
BEGIN
  -- Obtener título del curso
  SELECT title INTO course_title
  FROM courses
  WHERE id = NEW.course_id;
  
  -- Obtener nombre del creador
  SELECT full_name INTO creator_name
  FROM profiles
  WHERE id = NEW.created_by;
  
  -- Notificar a todos los estudiantes del curso
  FOR course_member IN
    SELECT student_id
    FROM course_enrollments
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM create_notification(
      course_member.student_id,
      NEW.created_by,
      'zoom_meeting',
      'Nueva reunión de Zoom programada',
      creator_name || ' programó una reunión: ' || NEW.topic,
      '/courses/' || NEW.course_id || '?tab=zoom'
    );
  END LOOP;
  
  -- Notificar a otros profesores del curso (excepto el creador)
  FOR course_member IN
    SELECT teacher_id
    FROM course_teachers
    WHERE course_id = NEW.course_id AND teacher_id != NEW.created_by
  LOOP
    PERFORM create_notification(
      course_member.teacher_id,
      NEW.created_by,
      'zoom_meeting',
      'Nueva reunión de Zoom programada',
      creator_name || ' programó una reunión: ' || NEW.topic,
      '/courses/' || NEW.course_id || '?tab=zoom'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Trigger para notificar cuando se crea una nueva reunión de Zoom
CREATE TRIGGER trigger_notify_new_zoom_meeting
AFTER INSERT ON public.zoom_meetings
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_zoom_meeting();