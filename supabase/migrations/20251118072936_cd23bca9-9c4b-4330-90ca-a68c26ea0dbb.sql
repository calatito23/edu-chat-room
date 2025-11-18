-- Add week_number column to zoom_meetings table
ALTER TABLE zoom_meetings ADD COLUMN week_number integer NOT NULL DEFAULT 1;

-- Add check constraint to ensure week_number is between 1 and 16
ALTER TABLE zoom_meetings ADD CONSTRAINT week_number_range CHECK (week_number >= 1 AND week_number <= 16);