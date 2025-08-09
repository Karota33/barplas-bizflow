-- 🚨 ARREGLANDO MVP - Asignar clientes al comercial test@barplas.com
UPDATE clientes 
SET comercial_id = 'fbf60cdb-f661-4da5-812d-361c26997f75' 
WHERE comercial_id = 'dc5f9151-3035-440a-b1da-146f0df20eed';

-- Crear catálogos personalizados para cada cliente
INSERT INTO catalogos_clientes (cliente_id, producto_id, activo) VALUES
-- Restaurante El Buen Sabor (necesita contenedores de alimentos)
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '73d41bc1-9450-48ee-9d96-4272da8884bf', true), -- Caja Plástica
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c49801c6-489f-4f74-935e-1708ee5137ae', true), -- Bandeja Perforada
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deaa6705-6ebe-4633-8ce1-cecb7debd440', true), -- Contenedor con Tapa

-- Supermercado FreshMart (necesita variedad de contenedores)
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '73d41bc1-9450-48ee-9d96-4272da8884bf', true), -- Caja Plástica
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '373dbdae-3f6b-4998-9aed-3bbadba17b88', true), -- Contenedor Industrial
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '3366fc48-dcea-451e-b054-ba49a82df611', true), -- Caja Eurobox
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c49801c6-489f-4f74-935e-1708ee5137ae', true), -- Bandeja Perforada

-- LogiCenter Valencia (necesita contenedores industriales)
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '373dbdae-3f6b-4998-9aed-3bbadba17b88', true), -- Contenedor Industrial
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '73d41bc1-9450-48ee-9d96-4272da8884bf', true), -- Caja Plástica

-- TechCorp Solutions (necesita contenedores organizacionales)
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '3366fc48-dcea-451e-b054-ba49a82df611', true), -- Caja Eurobox
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deaa6705-6ebe-4633-8ce1-cecb7debd440', true), -- Contenedor con Tapa

-- Industrias Alimentarias SUR (necesita contenedores para alimentos)
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '73d41bc1-9450-48ee-9d96-4272da8884bf', true), -- Caja Plástica
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c49801c6-489f-4f74-935e-1708ee5137ae', true), -- Bandeja Perforada
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deaa6705-6ebe-4633-8ce1-cecb7debd440', true); -- Contenedor con Tapa

-- Crear pedidos de ejemplo (datos reales para el dashboard)
INSERT INTO pedidos (cliente_id, total, estado, fecha_pedido, notas) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 285.75, 'confirmado', '2025-08-01', 'Pedido urgente para renovación stock'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 456.80, 'enviado', '2025-08-03', 'Entrega en almacén principal'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 654.50, 'pendiente', '2025-08-05', 'Confirmar fecha de entrega'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 187.40, 'confirmado', '2025-08-07', 'Pedido mensual estándar'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 342.90, 'enviado', '2025-08-08', 'Contenedores especiales para procesado');

-- Obtener IDs de pedidos para crear items (usamos CTE para obtener los IDs)
WITH pedido_ids AS (
  SELECT id, cliente_id, 
    ROW_NUMBER() OVER (ORDER BY fecha_pedido) as rn
  FROM pedidos 
  WHERE cliente_id IN ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
                       'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                       'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                       'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                       'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
)
INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
SELECT 
  p.id,
  CASE 
    WHEN p.rn = 1 THEN '73d41bc1-9450-48ee-9d96-4272da8884bf' -- Caja Plástica
    WHEN p.rn = 2 THEN '373dbdae-3f6b-4998-9aed-3bbadba17b88' -- Contenedor Industrial
    WHEN p.rn = 3 THEN '3366fc48-dcea-451e-b054-ba49a82df611' -- Caja Eurobox
    WHEN p.rn = 4 THEN 'deaa6705-6ebe-4633-8ce1-cecb7debd440' -- Contenedor con Tapa
    ELSE 'c49801c6-489f-4f74-935e-1708ee5137ae' -- Bandeja Perforada
  END as producto_id,
  CASE 
    WHEN p.rn = 1 THEN 15
    WHEN p.rn = 2 THEN 14
    WHEN p.rn = 3 THEN 50
    WHEN p.rn = 4 THEN 7
    ELSE 41
  END as cantidad,
  CASE 
    WHEN p.rn = 1 THEN 18.50
    WHEN p.rn = 2 THEN 32.75
    WHEN p.rn = 3 THEN 12.90
    WHEN p.rn = 4 THEN 24.60
    ELSE 8.25
  END as precio_unitario,
  CASE 
    WHEN p.rn = 1 THEN 277.50
    WHEN p.rn = 2 THEN 458.50
    WHEN p.rn = 3 THEN 645.00
    WHEN p.rn = 4 THEN 172.20
    ELSE 338.25
  END as subtotal
FROM pedido_ids p;