-- Move pg_net to extensions schema for security best practices
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the send_notification_email function to use extensions schema
CREATE OR REPLACE FUNCTION public.send_notification_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT;
BEGIN
  supabase_url := 'https://ombbxeommcwdkebrsowx.supabase.co';
  
  -- Make async HTTP request to edge function using pg_net from extensions schema
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'message', NEW.message,
      'link', NEW.link
    )
  );
  
  RETURN NEW;
END;
$function$;