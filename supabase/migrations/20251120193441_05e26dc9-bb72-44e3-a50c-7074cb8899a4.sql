-- Fix RLS policies for comments to allow teachers to comment

-- Drop existing comment policies
DROP POLICY IF EXISTS "Enrolled users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments on posts they can see" ON public.comments;
DROP POLICY IF EXISTS "Authors can update their comments" ON public.comments;
DROP POLICY IF EXISTS "Authors and course teachers can delete comments" ON public.comments;

-- Create new policies using is_course_member function
CREATE POLICY "Course members can create comments"
ON public.comments
FOR INSERT
WITH CHECK (
  public.is_course_member(auth.uid(), (SELECT course_id FROM posts WHERE id = comments.post_id))
  AND auth.uid() = author_id
);

CREATE POLICY "Course members can view comments"
ON public.comments
FOR SELECT
USING (
  public.is_course_member(auth.uid(), (SELECT course_id FROM posts WHERE id = comments.post_id))
);

CREATE POLICY "Authors can update their comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments"
ON public.comments
FOR DELETE
USING (auth.uid() = author_id);