import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type OrderStatus = 'pendiente' | 'confirmado' | 'en_proceso' | 'enviado' | 'entregado' | 'cancelado';

interface Order {
  id: string;
  numero_pedido: string;
  fecha_pedido: string;
  fecha_entrega: string | null;
  total: number;
  estado: OrderStatus;
  notas: string | null;
  cliente_id: string;
  clientes: {
    nombre: string;
    email: string;
  } | null;
  pedido_items: Array<{
    cantidad: number;
    precio_unitario: number;
    productos: {
      nombre: string;
      sku: string;
    } | null;
  }>;
}

interface OrderNote {
  id: string;
  order_id: string;
  note: string;
  created_at: string;
  user_name: string;
}

const ORDER_STATUSES = {
  pendiente: { 
    label: 'Pendiente', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock,
    progress: 0
  },
  confirmado: { 
    label: 'Confirmado', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: CheckCircle,
    progress: 25
  },
  en_proceso: { 
    label: 'En Proceso', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: Package,
    progress: 50
  },
  enviado: { 
    label: 'Enviado', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: Truck,
    progress: 75
  },
  entregado: { 
    label: 'Entregado', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: Star,
    progress: 100
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: Clock,
    progress: 0
  }
};

export function OrderTimeline() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      loadOrderNotes(selectedOrder.id);
    }
  }, [selectedOrder]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ordersData } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes!inner (
            nombre,
            email,
            comercial_id
          ),
          pedido_items (
            cantidad,
            precio_unitario,
            productos (
              nombre,
              sku
            )
          )
        `)
        .eq('clientes.comercial_id', user.id)
        .order('fecha_pedido', { ascending: false });

      if (ordersData) {
        setOrders(ordersData as Order[]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderNotes = async (orderId: string) => {
    try {
      // In a real app, you'd have an order_notes table
      // For now, we'll simulate with the existing notes field
      const notes: OrderNote[] = [
        {
          id: '1',
          order_id: orderId,
          note: 'Pedido confirmado por el cliente',
          created_at: new Date().toISOString(),
          user_name: 'Sistema'
        },
        {
          id: '2',
          order_id: orderId,
          note: 'Productos preparados para envío',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          user_name: 'Almacén'
        }
      ];
      
      setOrderNotes(notes);
    } catch (error) {
      console.error('Error loading order notes:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders => orders.map(order =>
        order.id === orderId 
          ? { ...order, estado: newStatus }
          : order
      ));

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, estado: newStatus });
      }

      toast.success(`Estado actualizado a ${ORDER_STATUSES[newStatus].label}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const addOrderNote = async () => {
    if (!newNote.trim() || !selectedOrder) return;

    // In a real app, you'd save this to the database
    const note: OrderNote = {
      id: Date.now().toString(),
      order_id: selectedOrder.id,
      note: newNote.trim(),
      created_at: new Date().toISOString(),
      user_name: 'Usuario'
    };

    setOrderNotes(notes => [note, ...notes]);
    setNewNote("");
    toast.success('Nota agregada');
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      pendiente: 'confirmado',
      confirmado: 'en_proceso',
      en_proceso: 'enviado',
      enviado: 'entregado',
      entregado: null,
      cancelado: null
    };
    
    return statusFlow[currentStatus];
  };

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.estado === statusFilter
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="card-barplas">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-muted rounded w-1/4"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Gestión de Pedidos</h2>
          <p className="text-muted-foreground">Seguimiento y control de estados</p>
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="border rounded-lg px-3 py-2 bg-background"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(ORDER_STATUSES).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {filteredOrders.length === 0 ? (
            <Card className="card-barplas">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay pedidos para mostrar</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order, index) => {
              const status = ORDER_STATUSES[order.estado];
              const StatusIcon = status.icon;
              const nextStatus = getNextStatus(order.estado);
              const isExpanded = expandedOrders.has(order.id);

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`card-barplas cursor-pointer transition-all hover:shadow-lg ${
                      selectedOrder?.id === order.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-6">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-semibold">{order.numero_pedido}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.clientes?.nombre}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                          <p className="text-sm font-semibold mt-1">
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progreso del pedido</span>
                          <span>{status.progress}%</span>
                        </div>
                        <Progress value={status.progress} className="h-2" />
                      </div>

                      {/* Order Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {nextStatus && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, nextStatus);
                              }}
                            >
                              Marcar como {ORDER_STATUSES[nextStatus].label}
                            </Button>
                          )}
                          
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOrderExpansion(order.id);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                                Detalles
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.fecha_pedido).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      {/* Collapsible Order Items */}
                      <Collapsible open={isExpanded} onOpenChange={() => toggleOrderExpansion(order.id)}>
                        <CollapsibleContent className="mt-4 pt-4 border-t">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Productos:</h4>
                            {order.pedido_items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex justify-between text-sm">
                                <span>
                                  {item.productos?.nombre || 'Producto'} x{item.cantidad}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(item.cantidad * parseFloat(item.precio_unitario.toString()))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Order Details Sidebar */}
        <div className="space-y-6">
          {selectedOrder ? (
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Selected Order Details */}
              <Card className="card-barplas">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Detalles del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedOrder.clientes?.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.clientes?.email}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha del pedido</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.fecha_pedido).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  {selectedOrder.fecha_entrega && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de entrega</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.fecha_entrega).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(selectedOrder.total)}
                    </p>
                  </div>

                  {selectedOrder.notas && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notas</p>
                      <p className="text-sm bg-muted p-2 rounded">
                        {selectedOrder.notas}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Notes */}
              <Card className="card-barplas">
                <CardHeader>
                  <CardTitle>Historial de Notas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Note */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Agregar nota interna..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-20"
                    />
                    <Button 
                      size="sm" 
                      onClick={addOrderNote}
                      disabled={!newNote.trim()}
                    >
                      Agregar Nota
                    </Button>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {orderNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-muted"
                      >
                        <p className="text-sm">{note.note}</p>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{note.user_name}</span>
                          <span>
                            {new Date(note.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="card-barplas">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Selecciona un pedido para ver los detalles
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}