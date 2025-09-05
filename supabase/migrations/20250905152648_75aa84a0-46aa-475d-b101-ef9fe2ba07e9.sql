-- Add user_id to contractors table and create profiles table
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create profiles table for role management
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin','contractor','customer')) DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admin_full_access_contractors" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_own_data" ON public.contractors;
DROP POLICY IF EXISTS "contractors_update_own_data" ON public.contractors;

-- Create new RLS policies for contractors
CREATE POLICY "admins_manage_contractors"
ON public.contractors
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "contractors_read_self"
ON public.contractors
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for profiles
CREATE POLICY "users_select_own_profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "users_insert_own_profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();