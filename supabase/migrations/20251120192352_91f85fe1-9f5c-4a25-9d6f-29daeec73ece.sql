-- Fix RLS policies for posts, files, and evaluations

-- DROP existing problematic policies for posts
DROP POLICY IF EXISTS "Users can view posts in their courses" ON public.posts;
DROP POLICY IF EXISTS "Teachers can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update their posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete their posts" ON public.posts;
DROP POLICY IF EXISTS "Course members can view posts" ON public.posts;
DROP POLICY IF EXISTS "Course members can create posts" ON public.posts;

-- Create comprehensive post policies
CREATE POLICY "Course members can view posts"
ON public.posts
FOR SELECT
USING (public.is_course_member(auth.uid(), course_id));

CREATE POLICY "Course members can create posts"
ON public.posts
FOR INSERT
WITH CHECK (public.is_course_member(auth.uid(), course_id));

CREATE POLICY "Authors can update their posts"
ON public.posts
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts"
ON public.posts
FOR DELETE
USING (auth.uid() = author_id);

-- Fix files policies
DROP POLICY IF EXISTS "Course members can view files" ON public.files;
DROP POLICY IF EXISTS "Teachers can upload files" ON public.files;
DROP POLICY IF EXISTS "Uploaders can delete their files" ON public.files;
DROP POLICY IF EXISTS "Course members can upload files" ON public.files;

CREATE POLICY "Course members can view files"
ON public.files
FOR SELECT
USING (public.is_course_member(auth.uid(), course_id));

CREATE POLICY "Course members can upload files"
ON public.files
FOR INSERT
WITH CHECK (public.is_course_member(auth.uid(), course_id));

CREATE POLICY "Uploaders can delete their files"
ON public.files
FOR DELETE
USING (auth.uid() = uploader_id);

-- Fix evaluations policies
DROP POLICY IF EXISTS "Teachers can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Students can view published evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Teachers can create evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Teachers can update evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Teachers can delete evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Course members can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Teachers and admins can create evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Creators can update evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Creators can delete evaluations" ON public.evaluations;

CREATE POLICY "Course members can view evaluations"
ON public.evaluations
FOR SELECT
USING (public.is_course_member(auth.uid(), course_id));

CREATE POLICY "Teachers and admins can create evaluations"
ON public.evaluations
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Creators can update evaluations"
ON public.evaluations
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete evaluations"
ON public.evaluations
FOR DELETE
USING (auth.uid() = created_by);