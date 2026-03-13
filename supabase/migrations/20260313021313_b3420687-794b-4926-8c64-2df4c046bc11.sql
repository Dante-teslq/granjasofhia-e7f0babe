
-- Step 1: Drop old constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_cargo_check;

-- Step 2: Migrate data BEFORE adding new constraint
UPDATE public.profiles SET cargo = 'Operador de Venda' WHERE cargo = 'Vendedor';
UPDATE public.profiles SET cargo = 'Operador de Depósito' WHERE cargo = 'Operador';
UPDATE public.profiles SET cargo = 'Operador de Depósito' WHERE cargo = 'Operador Depósito';

-- Step 3: Add new constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cargo_check CHECK (cargo = ANY (ARRAY['Admin'::text, 'Operador de Venda'::text, 'Operador de Depósito'::text, 'Supervisor'::text, 'Administrador'::text, 'Auditor'::text]));

-- Step 4: Update default
ALTER TABLE public.profiles ALTER COLUMN cargo SET DEFAULT 'Operador de Venda';

-- Step 5: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, cargo, pdv_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Operador de Venda'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'pdv_id' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'pdv_id' != '' 
      THEN (NEW.raw_user_meta_data->>'pdv_id')::uuid 
      ELSE NULL 
    END
  );
  RETURN NEW;
END;
$function$;
