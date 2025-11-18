-- Create zoom_meetings table to store Zoom meeting information
CREATE TABLE public.zoom_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  meeting_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  join_url TEXT NOT NULL,
  password TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;

-- Teachers can view meetings for their courses
CREATE POLICY "Teachers can view their course meetings"
ON public.zoom_meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = zoom_meetings.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Students can view meetings for courses they're enrolled in
CREATE POLICY "Students can view course meetings"
ON public.zoom_meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = zoom_meetings.course_id
    AND course_enrollments.student_id = auth.uid()
  )
);

-- Teachers can create meetings for their courses
CREATE POLICY "Teachers can create meetings for their courses"
ON public.zoom_meetings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = zoom_meetings.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Teachers can update meetings for their courses
CREATE POLICY "Teachers can update their course meetings"
ON public.zoom_meetings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = zoom_meetings.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Teachers can delete meetings for their courses
CREATE POLICY "Teachers can delete their course meetings"
ON public.zoom_meetings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = zoom_meetings.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_zoom_meetings_updated_at
BEFORE UPDATE ON public.zoom_meetings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();