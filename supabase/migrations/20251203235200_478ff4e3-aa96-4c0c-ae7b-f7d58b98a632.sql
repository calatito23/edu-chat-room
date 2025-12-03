-- Drop the extension from extensions schema and recreate in default net schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net;