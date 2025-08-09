-- Create sequence for order numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS pedidos_seq START 1;

-- Create trigger for automatic order number generation
CREATE TRIGGER generate_pedido_numero
    BEFORE INSERT ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_order_number();