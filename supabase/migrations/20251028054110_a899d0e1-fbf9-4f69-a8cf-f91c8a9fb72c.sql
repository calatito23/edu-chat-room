-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('student', 'teacher');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create course_enrollments table
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- Enable RLS on course_enrollments
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create messages table for chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create files table
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for courses
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (TRUE);

CREATE POLICY "Teachers can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = teacher_id);

-- RLS Policies for course_enrollments
CREATE POLICY "Users can view enrollments in their courses"
  ON public.course_enrollments FOR SELECT
  USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'student') AND auth.uid() = student_id);

CREATE POLICY "Students can unenroll from courses"
  ON public.course_enrollments FOR DELETE
  USING (auth.uid() = student_id);

-- RLS Policies for posts
CREATE POLICY "Users can view posts in enrolled courses"
  ON public.posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_enrollments.course_id = posts.course_id
      AND course_enrollments.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = posts.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create posts in their courses"
  ON public.posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = posts.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for comments
CREATE POLICY "Users can view comments on posts they can see"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = comments.post_id
      AND (
        EXISTS (
          SELECT 1 FROM public.course_enrollments
          WHERE course_enrollments.course_id = posts.course_id
          AND course_enrollments.student_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.courses
          WHERE courses.id = posts.course_id
          AND courses.teacher_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Enrolled users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = comments.post_id
      AND (
        EXISTS (
          SELECT 1 FROM public.course_enrollments
          WHERE course_enrollments.course_id = posts.course_id
          AND course_enrollments.student_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.courses
          WHERE courses.id = posts.course_id
          AND courses.teacher_id = auth.uid()
        )
      )
    ) AND auth.uid() = author_id
  );

CREATE POLICY "Authors can update their comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update message read status"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for files
CREATE POLICY "Users can view files in enrolled courses"
  ON public.files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_enrollments.course_id = files.course_id
      AND course_enrollments.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = files.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled users can upload files"
  ON public.files FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE course_enrollments.course_id = files.course_id
        AND course_enrollments.student_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = files.course_id
        AND courses.teacher_id = auth.uid()
      )
    ) AND auth.uid() = uploader_id
  );

CREATE POLICY "Uploaders can delete their files"
  ON public.files FOR DELETE
  USING (auth.uid() = uploader_id);

-- Create storage bucket for course files
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-files', 'course-files', FALSE);

-- Storage policies for course files
CREATE POLICY "Users can view files in enrolled courses"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-files' AND (
      EXISTS (
        SELECT 1 FROM public.files
        JOIN public.course_enrollments ON course_enrollments.course_id = files.course_id
        WHERE files.file_path = storage.objects.name
        AND course_enrollments.student_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.files
        JOIN public.courses ON courses.id = files.course_id
        WHERE files.file_path = storage.objects.name
        AND courses.teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enrolled users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;