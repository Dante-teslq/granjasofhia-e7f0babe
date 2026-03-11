
-- Update handle_new_user to default to 'Vendedor'
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, cargo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Vendedor')
  );
  RETURN NEW;
END;
$function$;

-- Update default for cargo column  
ALTER TABLE public.profiles ALTER COLUMN cargo SET DEFAULT 'Vendedor';
