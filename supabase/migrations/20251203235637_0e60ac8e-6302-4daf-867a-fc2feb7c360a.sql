-- Fix the send_notification_email function to use correct pg_net syntax
-- or make it fail gracefully if pg_net is not available

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
  
  -- Try to make HTTP request using pg_net extension
  -- If it fails, we still want the notification to be created
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the notification creation
    RAISE WARNING 'Failed to send notification email: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;