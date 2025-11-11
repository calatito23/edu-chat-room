-- Actualizar políticas de eliminación para permitir a los profesores eliminar posts en sus cursos
DROP POLICY IF EXISTS "Authors can delete their posts" ON public.posts;

CREATE POLICY "Authors and course teachers can delete posts"
ON public.posts
FOR DELETE
USING (
  auth.uid() = author_id 
  OR 
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = posts.course_id 
    AND courses.teacher_id = auth.uid()
  )
);

-- Actualizar políticas de eliminación para permitir a los profesores eliminar comentarios en posts de sus cursos
DROP POLICY IF EXISTS "Authors can delete their comments" ON public.comments;

CREATE POLICY "Authors and course teachers can delete comments"
ON public.comments
FOR DELETE
USING (
  auth.uid() = author_id 
  OR 
  EXISTS (
    SELECT 1 FROM posts 
    JOIN courses ON courses.id = posts.course_id 
    WHERE posts.id = comments.post_id 
    AND courses.teacher_id = auth.uid()
  )
);