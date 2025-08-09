import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrderItem {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  estado: 'pendiente' | 'confirmado' | 'no_confirmado' | 'sin_stock' | 'preparando' | 'enviado';
  notas_item?: string;
  stock_disponible?: number;
  fecha_confirmacion?: string;
}

export interface OperationalOrder {
  id: string;
  numero_pedido: string;
  estado: 'recibido' | 'revision' | 'confirmado_parcial' | 'preparacion' | 'enviado' | 'entregado' | 'cancelado';
  total: number;
  fecha_pedido: string;
  fecha_entrega_estimada?: string;
  items_confirmados: Record<string, any>;
  notas_operativas?: string;
  stock_confirmado: boolean;
  motivo_no_confirmado?: string;
  cliente_id: string;
}

export const useOrderOperations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 1. Confirm partial order with selected items
  const confirmPartialOrder = async (
    pedidoId: string, 
    selectedItems: { itemId: string; confirmed: boolean; notes?: string }[],
    operationalNotes?: string
  ) => {
    setLoading(true);
    try {
      // Update each item status
      const updatePromises = selectedItems.map(async ({ itemId, confirmed, notes }) => {
        const { error } = await supabase
          .from('pedido_items')
          .update({
            estado: confirmed ? 'confirmado' : 'no_confirmado',
            notas_item: notes,
            fecha_confirmacion: confirmed ? new Date().toISOString() : null
          })
          .eq('id', itemId);
        
        if (error) throw error;
      });

      await Promise.all(updatePromises);

      // Update order with operational notes
      const { error: orderError } = await supabase
        .from('pedidos')
        .update({
          notas_operativas: operationalNotes,
          items_confirmados: Object.fromEntries(
            selectedItems.map(item => [item.itemId, { confirmed: item.confirmed, notes: item.notes }])
          )
        })
        .eq('id', pedidoId);

      if (orderError) throw orderError;

      toast({
        title: "Pedido confirmado parcialmente",
        description: "Los items seleccionados han sido procesados",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 2. Update individual item status
  const updateItemStatus = async (
    itemId: string,
    newStatus: OrderItem['estado'],
    notes?: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pedido_items')
        .update({
          estado: newStatus,
          notas_item: notes,
          fecha_confirmacion: newStatus === 'confirmado' ? new Date().toISOString() : null
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Item marcado como ${newStatus}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 3. Check stock availability
  const checkStockAvailability = async (productIds: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('check_stock_availability', { product_ids: productIds });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      toast({
        title: "Error verificando stock",
        description: error.message,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 4. Schedule delivery
  const scheduleDelivery = async (pedidoId: string, deliveryDate: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({
          fecha_entrega_estimada: deliveryDate,
          estado: 'enviado'
        })
        .eq('id', pedidoId);

      if (error) throw error;

      toast({
        title: "Entrega programada",
        description: `Pedido programado para ${new Date(deliveryDate).toLocaleDateString()}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 5. Update order status
  const updateOrderStatus = async (
    pedidoId: string,
    newStatus: OperationalOrder['estado'],
    notes?: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({
          estado: newStatus,
          notas_operativas: notes
        })
        .eq('id', pedidoId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Pedido marcado como ${newStatus}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    confirmPartialOrder,
    updateItemStatus,
    checkStockAvailability,
    scheduleDelivery,
    updateOrderStatus
  };
};