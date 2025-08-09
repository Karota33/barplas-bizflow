import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, CheckCircle2, XCircle, Clock, AlertTriangle, Truck } from 'lucide-react';
import { useOrderOperations, type OperationalOrder, type OrderItem } from '@/hooks/useOrderOperations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ORDER_STATUS_CONFIG = {
  recibido: { label: 'Recibido', color: 'bg-blue-500', icon: Clock, progress: 10 },
  revision: { label: 'En Revisión', color: 'bg-yellow-500', icon: AlertTriangle, progress: 25 },
  confirmado_parcial: { label: 'Confirmado Parcial', color: 'bg-orange-500', icon: CheckCircle2, progress: 50 },
  preparacion: { label: 'En Preparación', color: 'bg-purple-500', icon: Clock, progress: 75 },
  enviado: { label: 'Enviado', color: 'bg-green-500', icon: Truck, progress: 90 },
  entregado: { label: 'Entregado', color: 'bg-green-600', icon: CheckCircle2, progress: 100 },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle, progress: 0 }
};

export const OperationalOrderManager: React.FC = () => {
  const [orders, setOrders] = useState<OperationalOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OperationalOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, { confirmed: boolean; notes: string }>>({});
  const [operationalNotes, setOperationalNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  const operations = useOrderOperations();
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          estado,
          total,
          fecha_pedido,
          fecha_entrega_estimada,
          items_confirmados,
          notas_operativas,
          stock_confirmado,
          motivo_no_confirmado,
          cliente_id,
          clientes (
            nombre,
            email,
            telefono
          )
        `)
        .order('fecha_pedido', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as OperationalOrder[]);
    } catch (error: any) {
      toast({
        title: "Error cargando pedidos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('pedido_items')
        .select(`
          *,
          productos (
            nombre,
            sku,
            precio
          )
        `)
        .eq('pedido_id', orderId);

      if (error) throw error;
      setOrderItems((data || []) as OrderItem[]);
      
      // Initialize selected items state
      const initialSelection: Record<string, { confirmed: boolean; notes: string }> = {};
      data?.forEach(item => {
        initialSelection[item.id] = {
          confirmed: item.estado === 'confirmado',
          notes: item.notas_item || ''
        };
      });
      setSelectedItems(initialSelection);
    } catch (error: any) {
      toast({
        title: "Error cargando items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleOrderSelect = (order: OperationalOrder) => {
    setSelectedOrder(order);
    setOperationalNotes(order.notas_operativas || '');
    setDeliveryDate(order.fecha_entrega_estimada || '');
    loadOrderItems(order.id);
  };

  const handleConfirmPartialOrder = async () => {
    if (!selectedOrder) return;

    const itemsToConfirm = Object.entries(selectedItems).map(([itemId, config]) => ({
      itemId,
      confirmed: config.confirmed,
      notes: config.notes
    }));

    const success = await operations.confirmPartialOrder(
      selectedOrder.id,
      itemsToConfirm,
      operationalNotes
    );

    if (success) {
      setShowConfirmDialog(false);
      loadOrders();
      loadOrderItems(selectedOrder.id);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OperationalOrder['estado']) => {
    const success = await operations.updateOrderStatus(orderId, newStatus, operationalNotes);
    if (success) {
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, estado: newStatus });
      }
    }
  };

  const handleScheduleDelivery = async () => {
    if (!selectedOrder || !deliveryDate) return;
    
    const success = await operations.scheduleDelivery(selectedOrder.id, deliveryDate);
    if (success) {
      loadOrders();
      setSelectedOrder({ ...selectedOrder, fecha_entrega_estimada: deliveryDate });
    }
  };

  const getOrderProgress = (order: OperationalOrder) => {
    return ORDER_STATUS_CONFIG[order.estado]?.progress || 0;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando pedidos operativos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión Operativa de Pedidos</h2>
        <Button onClick={loadOrders} variant="outline">
          Actualizar
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-4">
          {orders.map(order => {
            const statusConfig = ORDER_STATUS_CONFIG[order.estado];
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card 
                key={order.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedOrder?.id === order.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleOrderSelect(order)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{order.numero_pedido}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.fecha_pedido).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${statusConfig.color} text-white`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <Progress value={getOrderProgress(order)} className="mb-3" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <span>Total: €{Number(order.total).toFixed(2)}</span>
                    {order.fecha_entrega_estimada && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(order.fecha_entrega_estimada).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Details */}
        <div className="space-y-4">
          {selectedOrder ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Detalles Operativos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notas Operativas:</label>
                    <Textarea
                      value={operationalNotes}
                      onChange={(e) => setOperationalNotes(e.target.value)}
                      placeholder="Agregar notas internas..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha Entrega Estimada:</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                    <Button 
                      onClick={handleScheduleDelivery}
                      disabled={!deliveryDate}
                      size="sm"
                    >
                      Programar Entrega
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cambiar Estado:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
                        <Button
                          key={status}
                          variant={selectedOrder.estado === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, status as any)}
                          disabled={operations.loading}
                        >
                          {config.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowConfirmDialog(true)}
                    className="w-full"
                    disabled={!orderItems.length}
                  >
                    Confirmar Items Parciales
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Selecciona un pedido para ver los detalles operativos
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Partial Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Items - {selectedOrder?.numero_pedido}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {orderItems.map(item => (
              <div key={item.id} className="border rounded p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{(item as any).productos?.nombre}</h4>
                    <p className="text-sm text-muted-foreground">
                      SKU: {(item as any).productos?.sku} | Cantidad: {item.cantidad} | 
                      Precio: €{Number(item.precio_unitario).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedItems[item.id]?.confirmed || false}
                      onCheckedChange={(checked) => 
                        setSelectedItems(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], confirmed: checked as boolean }
                        }))
                      }
                    />
                    <span className="text-sm">Confirmar</span>
                  </div>
                </div>

                <Textarea
                  placeholder="Notas para este item..."
                  value={selectedItems[item.id]?.notes || ''}
                  onChange={(e) => 
                    setSelectedItems(prev => ({
                      ...prev,
                      [item.id]: { ...prev[item.id], notes: e.target.value }
                    }))
                  }
                />
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleConfirmPartialOrder}
                disabled={operations.loading}
                className="flex-1"
              >
                Confirmar Selección
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};