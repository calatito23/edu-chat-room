-- Función para notificar sobre nuevos mensajes
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
BEGIN
  -- Obtener nombre del remitente
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Notificar al receptor del mensaje
  PERFORM create_notification(
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    'Nuevo mensaje',
    sender_name || ' te ha enviado un mensaje',
    '/chat?user=' || NEW.sender_id
  );
  
  RETURN NEW;
END;
$function$;

-- Trigger para notificar cuando se recibe un nuevo mensaje
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();