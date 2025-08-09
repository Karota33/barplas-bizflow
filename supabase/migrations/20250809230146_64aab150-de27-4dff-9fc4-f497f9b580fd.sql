-- First, update existing invalid states to valid ones
UPDATE public.pedidos 
SET estado = CASE 
    WHEN estado = 'pendiente' THEN 'recibido'
    WHEN estado NOT IN ('recibido', 'revision', 'confirmado_parcial', 'preparacion', 'enviado', 'entregado', 'cancelado') THEN 'recibido'
    ELSE estado
END;

-- Drop the old constraint if exists
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;

-- Add new columns for operational workflow
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS items_confirmados JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notas_operativas TEXT,
ADD COLUMN IF NOT EXISTS fecha_entrega_estimada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stock_confirmado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_no_confirmado TEXT;

-- Now add the new constraint
ALTER TABLE public.pedidos 
ADD CONSTRAINT pedidos_estado_workflow_check 
CHECK (estado IN ('recibido', 'revision', 'confirmado_parcial', 'preparacion', 'enviado', 'entregado', 'cancelado'));

-- Add item status tracking to pedido_items
ALTER TABLE public.pedido_items 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS fecha_confirmacion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notas_item TEXT,
ADD COLUMN IF NOT EXISTS stock_disponible INTEGER;

-- Create check constraint for item states
ALTER TABLE public.pedido_items 
ADD CONSTRAINT pedido_items_estado_check 
CHECK (estado IN ('pendiente', 'confirmado', 'no_confirmado', 'sin_stock', 'preparando', 'enviado'));

-- Create function to update order status based on items
CREATE OR REPLACE FUNCTION public.update_order_status_from_items()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS update_order_status_trigger ON public.pedido_items;
CREATE TRIGGER update_order_status_trigger
    AFTER UPDATE ON public.pedido_items
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION public.update_order_status_from_items();