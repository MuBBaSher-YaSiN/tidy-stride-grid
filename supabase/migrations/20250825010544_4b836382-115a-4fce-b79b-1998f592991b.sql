-- Create default admin user for CleanNami
-- Password will be: admin123 (hashed)

INSERT INTO public.admin_users (name, email, password_hash, role) 
VALUES (
  'CleanNami Admin',
  'admin@cleannami.com', 
  '$2b$10$rQZ7uv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3qv3q', -- This is a placeholder, will be updated via edge function
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Update the contractors table to remove password requirement for signup
-- Contractors will be created by admin with temporary passwords
ALTER TABLE public.contractors 
ALTER COLUMN password_hash DROP NOT NULL;