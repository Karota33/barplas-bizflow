-- Fix the generate_order_number function security
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.numero_pedido = 'PED-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('pedidos_seq')::text, 4, '0');
    RETURN NEW;
END;
$$;