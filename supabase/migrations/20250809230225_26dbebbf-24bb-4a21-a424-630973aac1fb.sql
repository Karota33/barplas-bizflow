-- Fix function security issues by setting search_path

-- Fix the update_order_status_from_items function
CREATE OR REPLACE FUNCTION public.update_order_status_from_items()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.pedidos 
    SET 
        estado = CASE 
            WHEN (SELECT COUNT(*) FROM public.pedido_items WHERE pedido_id = NEW.pedido_id AND estado = 'confirmado') = 
                 (SELECT COUNT(*) FROM public.pedido_items WHERE pedido_id = NEW.pedido_id) THEN 'preparacion'
            WHEN (SELECT COUNT(*) FROM public.pedido_items WHERE pedido_id = NEW.pedido_id AND estado IN ('confirmado', 'no_confirmado')) > 0 THEN 'confirmado_parcial'
            ELSE estado
        END,
        updated_at = NOW()
    WHERE id = NEW.pedido_id;
    
    RETURN NEW;
END;
$$;

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create the trigger for automatic status updates
DROP TRIGGER IF EXISTS update_order_status_trigger ON public.pedido_items;
CREATE TRIGGER update_order_status_trigger
    AFTER UPDATE ON public.pedido_items
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION public.update_order_status_from_items();

-- Create operational functions with proper security
CREATE OR REPLACE FUNCTION public.check_stock_availability(product_ids UUID[])
RETURNS TABLE(producto_id UUID, stock_disponible INTEGER, nombre TEXT, precio NUMERIC) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as producto_id,
        -- Simulate stock - in real system this would come from inventory table
        (RANDOM() * 100)::INTEGER as stock_disponible,
        p.nombre,
        p.precio
    FROM public.productos p
    WHERE p.id = ANY(product_ids);
END;
$$;