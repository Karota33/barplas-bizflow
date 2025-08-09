-- Crear registro comercial para test@barplas.com
INSERT INTO public.comerciales (id, nombre, email, activo, created_at, updated_at) 
VALUES (
  'fbf60cdb-f661-4da5-812d-361c26997f75',
  'Comercial Test BARPLAS',
  'test@barplas.com',
  true,
  NOW(),
  NOW()
);