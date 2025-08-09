-- Actualizar la contraseña del usuario test@barplas.com
-- Primero eliminamos el usuario existente y lo recreamos con la contraseña correcta
UPDATE auth.users 
SET 
  encrypted_password = crypt('karota33', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'test@barplas.com';