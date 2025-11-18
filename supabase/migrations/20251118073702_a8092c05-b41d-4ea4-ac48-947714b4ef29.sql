-- Add is_recording column to files table to mark Zoom recordings
ALTER TABLE files ADD COLUMN is_recording boolean NOT NULL DEFAULT false;