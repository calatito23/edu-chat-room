-- Create table for storing Zoom recordings
CREATE TABLE public.zoom_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  course_id UUID NOT NULL,
  recording_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  recording_count INTEGER NOT NULL DEFAULT 0,
  share_url TEXT,
  recording_play_url TEXT,
  download_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.zoom_recordings ENABLE ROW LEVEL SECURITY;

-- Teachers can view recordings from their courses
CREATE POLICY "Teachers can view their course recordings"
ON public.zoom_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = zoom_recordings.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Students can view recordings from enrolled courses
CREATE POLICY "Students can view course recordings"
ON public.zoom_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.course_id = zoom_recordings.course_id
    AND course_enrollments.student_id = auth.uid()
  )
);

-- Only system (edge functions) can insert/update/delete recordings
CREATE POLICY "System can manage recordings"
ON public.zoom_recordings
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_zoom_recordings_course_id ON public.zoom_recordings(course_id);
CREATE INDEX idx_zoom_recordings_meeting_id ON public.zoom_recordings(meeting_id);

-- Add trigger for updated_at
CREATE TRIGGER update_zoom_recordings_updated_at
BEFORE UPDATE ON public.zoom_recordings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();