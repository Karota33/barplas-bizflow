-- Agregar roles al sistema
ALTER TABLE comerciales ADD COLUMN role TEXT DEFAULT 'comercial';

-- Crear storage buckets para imágenes
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('clients', 'clients', true);

-- Políticas de storage para productos (solo admin puede subir)
CREATE POLICY "Admin can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' AND 
    auth.uid() IN (SELECT id FROM comerciales WHERE role = 'admin')
  );

CREATE POLICY "Everyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Admin can update product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'products' AND 
    auth.uid() IN (SELECT id FROM comerciales WHERE role = 'admin')
  );

CREATE POLICY "Admin can delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'products' AND 
    auth.uid() IN (SELECT id FROM comerciales WHERE role = 'admin')
  );

-- Políticas de storage para clientes
CREATE POLICY "Comercial can upload client logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clients' AND 
    auth.uid() IN (SELECT id FROM comerciales)
  );

CREATE POLICY "Everyone can view client logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'clients');

CREATE POLICY "Comercial can update client logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'clients' AND 
    auth.uid() IN (SELECT id FROM comerciales)
  );

-- Agregar campos adicionales a clientes
ALTER TABLE clientes ADD COLUMN logo_url TEXT;
ALTER TABLE clientes ADD COLUMN tipo TEXT DEFAULT 'minorista';
ALTER TABLE clientes ADD COLUMN notas TEXT;

-- Agregar campos adicionales a productos
ALTER TABLE productos ADD COLUMN categoria TEXT;
ALTER TABLE productos ADD COLUMN stock_disponible INTEGER DEFAULT 0;

-- Crear función para verificar rol de admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM comerciales 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Actualizar políticas de productos para permitir que admin gestione todo
DROP POLICY IF EXISTS "productos_write_policy" ON productos;
CREATE POLICY "productos_write_policy" ON productos
  FOR ALL USING (is_admin());

-- Crear usuario admin por defecto
UPDATE comerciales SET role = 'admin' WHERE email = 'test@barplas.com';