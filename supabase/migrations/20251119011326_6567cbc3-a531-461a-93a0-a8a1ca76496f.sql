-- Create table to link teachers with courses (similar to enrollments for students)
CREATE TABLE IF NOT EXISTS public.course_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID NOT NULL,
  UNIQUE(course_id, teacher_id)
);

-- Enable RLS on course_teachers
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;

-- Update courses table - remove teacher_id requirement and add created_by for admin tracking
ALTER TABLE public.courses ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- RLS Policies for course_teachers
CREATE POLICY "Administrators can manage course teachers"
ON public.course_teachers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Teachers can view their course assignments"
ON public.course_teachers
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Update courses RLS policies
DROP POLICY IF EXISTS "Teachers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can delete their courses" ON public.courses;

CREATE POLICY "Administrators can create courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrator') AND auth.uid() = created_by);

CREATE POLICY "Administrators can update courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can delete courses"
ON public.courses
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Teachers can view their assigned courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = courses.id AND teacher_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = courses.id AND student_id = auth.uid()
  )
);

-- Update course_enrollments RLS policies
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

CREATE POLICY "Administrators can manage enrollments"
ON public.course_enrollments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Update files RLS to work with course_teachers
DROP POLICY IF EXISTS "Only course teachers can upload files" ON public.files;

CREATE POLICY "Administrators and assigned teachers can upload files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR
  (EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = files.course_id AND teacher_id = auth.uid()
  ) AND auth.uid() = uploader_id)
);

DROP POLICY IF EXISTS "Course teachers can delete any file" ON public.files;

CREATE POLICY "Administrators and assigned teachers can delete files"
ON public.files
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = files.course_id AND teacher_id = auth.uid()
  )
);

-- Update evaluations RLS policies
DROP POLICY IF EXISTS "Teachers can create evaluations" ON public.evaluations;

CREATE POLICY "Administrators and assigned teachers can create evaluations"
ON public.evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR
  (EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = evaluations.course_id AND teacher_id = auth.uid()
  ) AND auth.uid() = created_by)
);

DROP POLICY IF EXISTS "Teachers can update their evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Teachers can delete their evaluations" ON public.evaluations;

CREATE POLICY "Administrators and assigned teachers can update evaluations"
ON public.evaluations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = evaluations.course_id AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Administrators and assigned teachers can delete evaluations"
ON public.evaluations
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = evaluations.course_id AND teacher_id = auth.uid()
  )
);

-- Update posts RLS policies
DROP POLICY IF EXISTS "Teachers can create posts in their courses" ON public.posts;

CREATE POLICY "Administrators and assigned teachers can create posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = posts.course_id AND teacher_id = auth.uid()
  )
);

-- Update zoom_meetings RLS policies
DROP POLICY IF EXISTS "Teachers can view their course meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can create meetings for their courses" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can update their course meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can delete their course meetings" ON public.zoom_meetings;

CREATE POLICY "Administrators and assigned teachers can view meetings"
ON public.zoom_meetings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = zoom_meetings.course_id AND teacher_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = zoom_meetings.course_id AND student_id = auth.uid()
  )
);

CREATE POLICY "Administrators and assigned teachers can create meetings"
ON public.zoom_meetings
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = zoom_meetings.course_id AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Administrators and assigned teachers can update meetings"
ON public.zoom_meetings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = zoom_meetings.course_id AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Administrators and assigned teachers can delete meetings"
ON public.zoom_meetings
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  EXISTS (
    SELECT 1 FROM public.course_teachers
    WHERE course_id = zoom_meetings.course_id AND teacher_id = auth.uid()
  )
);