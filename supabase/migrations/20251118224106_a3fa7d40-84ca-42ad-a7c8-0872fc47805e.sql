-- Fix search_path for notify_on_message_created function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;