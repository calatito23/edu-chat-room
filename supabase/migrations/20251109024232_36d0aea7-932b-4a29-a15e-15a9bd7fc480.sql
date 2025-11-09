-- Agregar columna week_number a la tabla files
ALTER TABLE files
ADD COLUMN week_number integer NOT NULL DEFAULT 1;

-- Agregar constraint para validar que week_number esté entre 1 y 16
ALTER TABLE files
ADD CONSTRAINT week_number_range CHECK (week_number >= 1 AND week_number <= 16);

-- Crear índice para mejorar consultas por semana
CREATE INDEX idx_files_course_week ON files(course_id, week_number);