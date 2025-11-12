-- Crear tipo enum para los tipos de preguntas
CREATE TYPE question_type AS ENUM (
  'short_answer',
  'multiple_choice',
  'multiple_select',
  'file_upload',
  'true_false',
  'matching'
);

-- Tabla de evaluaciones
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de preguntas de evaluación
CREATE TABLE public.evaluation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  order_number INTEGER NOT NULL,
  options JSONB, -- Para opciones de múltiple opción/selección/relacionar
  correct_answer JSONB NOT NULL, -- Respuesta(s) correcta(s)
  points DECIMAL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de entregas de evaluaciones
CREATE TABLE public.evaluation_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  score DECIMAL,
  total_points DECIMAL,
  UNIQUE(evaluation_id, student_id)
);

-- Tabla de respuestas individuales
CREATE TABLE public.evaluation_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.evaluation_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.evaluation_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  is_correct BOOLEAN,
  points_earned DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_answers ENABLE ROW LEVEL SECURITY;

-- Políticas para evaluations
CREATE POLICY "Course members can view evaluations"
ON public.evaluations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = evaluations.course_id
    AND courses.teacher_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.course_id = evaluations.course_id
    AND course_enrollments.student_id = auth.uid()
  )
);

CREATE POLICY "Teachers can create evaluations"
ON public.evaluations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = evaluations.course_id
    AND courses.teacher_id = auth.uid()
  ) AND auth.uid() = created_by
);

CREATE POLICY "Teachers can update their evaluations"
ON public.evaluations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = evaluations.course_id
    AND courses.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their evaluations"
ON public.evaluations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = evaluations.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Políticas para evaluation_questions
CREATE POLICY "Course members can view questions"
ON public.evaluation_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = evaluation_questions.evaluation_id
    AND (c.teacher_id = auth.uid() OR EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = c.id
      AND course_enrollments.student_id = auth.uid()
    ))
  )
);

CREATE POLICY "Teachers can manage questions"
ON public.evaluation_questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = evaluation_questions.evaluation_id
    AND c.teacher_id = auth.uid()
  )
);

-- Políticas para evaluation_submissions
CREATE POLICY "Students can view their own submissions"
ON public.evaluation_submissions FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all submissions"
ON public.evaluation_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = evaluation_submissions.evaluation_id
    AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can submit evaluations"
ON public.evaluation_submissions FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM evaluations e
    JOIN course_enrollments ce ON ce.course_id = e.course_id
    WHERE e.id = evaluation_submissions.evaluation_id
    AND ce.student_id = auth.uid()
  )
);

-- Políticas para evaluation_answers
CREATE POLICY "Students can view their own answers"
ON public.evaluation_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM evaluation_submissions
    WHERE evaluation_submissions.id = evaluation_answers.submission_id
    AND evaluation_submissions.student_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view all answers"
ON public.evaluation_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM evaluation_submissions es
    JOIN evaluations e ON e.id = es.evaluation_id
    JOIN courses c ON c.id = e.course_id
    WHERE es.id = evaluation_answers.submission_id
    AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their answers"
ON public.evaluation_answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM evaluation_submissions
    WHERE evaluation_submissions.id = evaluation_answers.submission_id
    AND evaluation_submissions.student_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();