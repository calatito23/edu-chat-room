-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _sender_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, sender_id, type, title, message, link)
  VALUES (_user_id, _sender_id, _type, _title, _message, _link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger for new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_notification(
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    'Nuevo mensaje',
    'Has recibido un nuevo mensaje',
    '/chat'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Trigger for course enrollment
CREATE OR REPLACE FUNCTION public.notify_course_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title TEXT;
  teacher_id UUID;
BEGIN
  SELECT title, teacher_id INTO course_title, teacher_id
  FROM courses
  WHERE id = NEW.course_id;
  
  PERFORM create_notification(
    NEW.student_id,
    teacher_id,
    'enrollment',
    'Agregado a curso',
    'Has sido agregado al curso: ' || course_title,
    '/courses/' || NEW.course_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_course_enrollment
AFTER INSERT ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.notify_course_enrollment();

-- Trigger for course unenrollment
CREATE OR REPLACE FUNCTION public.notify_course_unenrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title TEXT;
  teacher_id UUID;
BEGIN
  SELECT title, teacher_id INTO course_title, teacher_id
  FROM courses
  WHERE id = OLD.course_id;
  
  PERFORM create_notification(
    OLD.student_id,
    teacher_id,
    'unenrollment',
    'Removido de curso',
    'Has sido removido del curso: ' || course_title,
    '/dashboard'
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_course_unenrollment
AFTER DELETE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.notify_course_unenrollment();

-- Trigger for new evaluation
CREATE OR REPLACE FUNCTION public.notify_new_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN
    SELECT student_id
    FROM course_enrollments
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM create_notification(
      student_record.student_id,
      NEW.created_by,
      'evaluation',
      'Nueva evaluación',
      'Se ha asignado una nueva evaluación: ' || NEW.title,
      '/courses/' || NEW.course_id || '?tab=evaluations'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_evaluation
AFTER INSERT ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_evaluation();

-- Trigger for grade update
CREATE OR REPLACE FUNCTION public.notify_grade_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evaluation_title TEXT;
  course_id UUID;
  teacher_id UUID;
BEGIN
  IF NEW.score IS NOT NULL AND (OLD.score IS NULL OR OLD.score != NEW.score) THEN
    SELECT e.title, e.course_id, c.teacher_id INTO evaluation_title, course_id, teacher_id
    FROM evaluations e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = NEW.evaluation_id;
    
    PERFORM create_notification(
      NEW.student_id,
      teacher_id,
      'grade',
      'Nota calificada',
      'Tu evaluación "' || evaluation_title || '" ha sido calificada',
      '/courses/' || course_id || '?tab=grades'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_grade_update
AFTER UPDATE ON public.evaluation_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_grade_update();

-- Trigger for new file upload
CREATE OR REPLACE FUNCTION public.notify_new_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  course_title TEXT;
BEGIN
  SELECT title INTO course_title
  FROM courses
  WHERE id = NEW.course_id;
  
  FOR student_record IN
    SELECT student_id
    FROM course_enrollments
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM create_notification(
      student_record.student_id,
      NEW.uploader_id,
      'file',
      'Nuevo material',
      'Se ha subido nuevo material en: ' || course_title,
      '/courses/' || NEW.course_id || '?tab=files'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_file
AFTER INSERT ON public.files
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_file();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;