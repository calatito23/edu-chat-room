-- Drop the old trigger for message notifications
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
DROP FUNCTION IF EXISTS notify_on_message_created();

-- Create improved function for message notifications with user_id in link
CREATE OR REPLACE FUNCTION notify_on_message_created()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender's name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification for receiver with sender_id in the link
  PERFORM create_notification(
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    'Nuevo mensaje',
    sender_name || ' te envió un mensaje',
    '/chat?user=' || NEW.sender_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_message_created();