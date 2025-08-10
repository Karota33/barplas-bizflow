-- Update comerciales table to allow creating records without auth user ID
-- The id will be auto-generated and later linked when user registers

-- First, let's modify the RLS policy to allow admin insertion
DROP POLICY IF EXISTS "comerciales_policy" ON comerciales;

CREATE POLICY "comerciales_read_policy" ON comerciales 
FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "comerciales_write_policy" ON comerciales 
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "comerciales_update_policy" ON comerciales 
FOR UPDATE USING (auth.uid() = id OR is_admin());

CREATE POLICY "comerciales_delete_policy" ON comerciales 
FOR DELETE USING (is_admin());