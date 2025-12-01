-- Tabla para columnas de notas personalizadas
CREATE TABLE public.custom_grade_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para las calificaciones personalizadas
CREATE TABLE public.custom_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.custom_grade_columns(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score NUMERIC,
  max_score NUMERIC NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(column_id, student_id)
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_custom_grades_updated_at
  BEFORE UPDATE ON public.custom_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS para custom_grade_columns
ALTER TABLE public.custom_grade_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course members can view custom grade columns"
  ON public.custom_grade_columns
  FOR SELECT
  USING (is_course_member(auth.uid(), course_id));

CREATE POLICY "Teachers and admins can create custom grade columns"
  ON public.custom_grade_columns
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'administrator') OR
    EXISTS (
      SELECT 1 FROM course_teachers
      WHERE course_id = custom_grade_columns.course_id
      AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers and admins can delete custom grade columns"
  ON public.custom_grade_columns
  FOR DELETE
  USING (
    has_role(auth.uid(), 'administrator') OR
    EXISTS (
      SELECT 1 FROM course_teachers
      WHERE course_id = custom_grade_columns.course_id
      AND teacher_id = auth.uid()
    )
  );

-- RLS para custom_grades
ALTER TABLE public.custom_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course members can view custom grades"
  ON public.custom_grades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_grade_columns cgc
      WHERE cgc.id = custom_grades.column_id
      AND is_course_member(auth.uid(), cgc.course_id)
    )
  );

CREATE POLICY "Teachers and admins can manage custom grades"
  ON public.custom_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_grade_columns cgc
      WHERE cgc.id = custom_grades.column_id
      AND (
        has_role(auth.uid(), 'administrator') OR
        EXISTS (
          SELECT 1 FROM course_teachers ct
          WHERE ct.course_id = cgc.course_id
          AND ct.teacher_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_grade_columns cgc
      WHERE cgc.id = custom_grades.column_id
      AND (
        has_role(auth.uid(), 'administrator') OR
        EXISTS (
          SELECT 1 FROM course_teachers ct
          WHERE ct.course_id = cgc.course_id
          AND ct.teacher_id = auth.uid()
        )
      )
    )
  );