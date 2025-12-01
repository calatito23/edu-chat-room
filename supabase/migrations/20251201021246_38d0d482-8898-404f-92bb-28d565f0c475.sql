-- Función para notificar sobre nuevas publicaciones
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_member RECORD;
  course_title TEXT;
  author_name TEXT;
BEGIN
  -- Obtener título del curso
  SELECT title INTO course_title
  FROM courses
  WHERE id = NEW.course_id;
  
  -- Obtener nombre del autor
  SELECT full_name INTO author_name
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Notificar a todos los estudiantes del curso (excepto el autor)
  FOR course_member IN
    SELECT student_id
    FROM course_enrollments
    WHERE course_id = NEW.course_id AND student_id != NEW.author_id
  LOOP
    PERFORM create_notification(
      course_member.student_id,
      NEW.author_id,
      'post',
      'Nueva publicación en ' || course_title,
      author_name || ' escribió una nueva publicación',
      '/courses/' || NEW.course_id || '?tab=stream'
    );
  END LOOP;
  
  -- Notificar a todos los profesores del curso (excepto el autor)
  FOR course_member IN
    SELECT teacher_id
    FROM course_teachers
    WHERE course_id = NEW.course_id AND teacher_id != NEW.author_id
  LOOP
    PERFORM create_notification(
      course_member.teacher_id,
      NEW.author_id,
      'post',
      'Nueva publicación en ' || course_title,
      author_name || ' escribió una nueva publicación',
      '/courses/' || NEW.course_id || '?tab=stream'
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Trigger para notificar cuando se crea una nueva publicación
CREATE TRIGGER trigger_notify_new_post
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_post();