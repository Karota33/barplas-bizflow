-- Update pedidos table for operational workflow
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;

-- Add new columns for operational workflow
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS items_confirmados JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notas_operativas TEXT,
ADD COLUMN IF NOT EXISTS fecha_entrega_estimada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stock_confirmado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_no_confirmado TEXT;

-- Update estado column to support new workflow states
ALTER TABLE public.pedidos 
ALTER COLUMN estado SET DEFAULT 'recibido';

-- Create check constraint with new states
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
    -- Update parent order status based on item confirmations
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
CREATE OR REPLACE TRIGGER update_order_status_trigger
    AFTER UPDATE ON public.pedido_items
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION public.update_order_status_from_items();

-- Create function to check stock availability
CREATE OR REPLACE FUNCTION public.check_stock_availability(product_ids UUID[])
RETURNS TABLE(producto_id UUID, stock_disponible INTEGER, nombre TEXT, precio NUMERIC) AS $$
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
$$ LANGUAGE plpgsql;

-- Create sequence for operational reports
CREATE SEQUENCE IF NOT EXISTS public.report_sequence START 1;

-- Create operational reports table
CREATE TABLE IF NOT EXISTS public.reportes_operativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_reporte TEXT NOT NULL DEFAULT ('REP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('report_sequence')::text, 4, '0')),
    tipo TEXT NOT NULL CHECK (tipo IN ('comisiones', 'ventas', 'stock', 'entregas')),
    comercial_id UUID,
    periodo_inicio DATE,
    periodo_fin DATE,
    filtros JSONB,
    datos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reports table
ALTER TABLE public.reportes_operativos ENABLE ROW LEVEL SECURITY;

-- Create policy for reports
CREATE POLICY "reportes_policy" ON public.reportes_operativos
FOR ALL USING (
    comercial_id IN (
        SELECT id FROM comerciales WHERE auth.uid() = id
    )
);

-- Create trigger for reports updated_at
CREATE OR REPLACE TRIGGER update_reportes_updated_at
    BEFORE UPDATE ON public.reportes_operativos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();