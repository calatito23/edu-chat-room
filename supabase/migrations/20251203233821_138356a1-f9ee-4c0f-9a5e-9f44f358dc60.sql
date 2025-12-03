-- Create a trigger function that calls the send-notification-email edge function
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get the Supabase URL from environment (stored in vault or hardcoded for edge function)
  supabase_url := 'https://ombbxeommcwdkebrsowx.supabase.co';
  
  -- Make async HTTP request to edge function using pg_net
  PERFORM net.http_post(
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

-- Create trigger to send email on notification insert
DROP TRIGGER IF EXISTS on_notification_created_send_email ON public.notifications;
CREATE TRIGGER on_notification_created_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email();