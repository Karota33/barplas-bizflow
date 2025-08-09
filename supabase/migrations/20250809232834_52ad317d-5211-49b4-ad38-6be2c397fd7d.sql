-- Arreglar función de seguridad is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM comerciales 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;