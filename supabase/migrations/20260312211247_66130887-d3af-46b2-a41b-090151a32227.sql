
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, cargo, pdv_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Vendedor'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'pdv_id' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'pdv_id' != '' 
      THEN (NEW.raw_user_meta_data->>'pdv_id')::uuid 
      ELSE NULL 
    END
  );
  RETURN NEW;
END;
$$;
