
-- Drop old check constraint on cargo
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cargo_check;

-- Add new check constraint with updated roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cargo_check 
  CHECK (cargo IN ('Admin', 'Vendedor', 'Operador Depósito', 'Operador', 'Supervisor', 'Administrador', 'Auditor'));
