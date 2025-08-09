-- Remove all existing constraints first
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_workflow_check;

-- Update all existing data to 'recibido' to ensure consistency
UPDATE public.pedidos SET estado = 'recibido';

-- Add new operational columns
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS items_confirmados JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notas_operativas TEXT,
ADD COLUMN IF NOT EXISTS fecha_entrega_estimada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stock_confirmado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_no_confirmado TEXT;

-- Now create the new workflow constraint
ALTER TABLE public.pedidos 
ADD CONSTRAINT pedidos_estado_workflow_check 
CHECK (estado IN ('recibido', 'revision', 'confirmado_parcial', 'preparacion', 'enviado', 'entregado', 'cancelado'));

-- Add operational tracking to items
ALTER TABLE public.pedido_items 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS fecha_confirmacion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notas_item TEXT,
ADD COLUMN IF NOT EXISTS stock_disponible INTEGER;

-- Add items constraint
ALTER TABLE public.pedido_items 
ADD CONSTRAINT pedido_items_estado_check 
CHECK (estado IN ('pendiente', 'confirmado', 'no_confirmado', 'sin_stock', 'preparando', 'enviado'));