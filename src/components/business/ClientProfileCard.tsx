import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit3,
  Save,
  X,
  ShoppingBag,
  TrendingUp,
  Star,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Client {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
  created_at: string;
  comercial_id: string;
}

interface ClientStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  favoriteProducts: string[];
}

interface ClientProfileCardProps {
  clientId?: string;
  onClientUpdated?: (client: Client) => void;
  className?: string;
}

export function ClientProfileCard({ 
  clientId, 
  onClientUpdated,
  className = "" 
}: ClientProfileCardProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    activo: true
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Load client basic info
      const { data: clientData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      if (clientData) {
        setClient(clientData);
        setFormData({
          nombre: clientData.nombre || '',
          email: clientData.email || '',
          telefono: clientData.telefono || '',
          direccion: clientData.direccion || '',
          activo: clientData.activo || true
        });
      }

      // Load client statistics
      await loadClientStats(clientId);
      
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  const loadClientStats = async (clientId: string) => {
    try {
      const { data: ordersData } = await supabase
        .from('pedidos')
        .select(`
          *,
          pedido_items (
            cantidad,
            precio_unitario,
            productos (
              nombre
            )
          )
        `)
        .eq('cliente_id', clientId)
        .order('fecha_pedido', { ascending: false });

      if (ordersData) {
        const totalOrders = ordersData.length;
        const totalSpent = ordersData.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        const lastOrderDate = ordersData.length > 0 ? ordersData[0].fecha_pedido : null;

        // Calculate favorite products
        const productCounts = new Map();
        ordersData.forEach(order => {
          order.pedido_items?.forEach((item: any) => {
            const productName = item.productos?.nombre;
            if (productName) {
              productCounts.set(productName, (productCounts.get(productName) || 0) + item.cantidad);
            }
          });
        });

        const favoriteProducts = Array.from(productCounts.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([name]) => name);

        setClientStats({
          totalOrders,
          totalSpent,
          averageOrderValue,
          lastOrderDate,
          favoriteProducts
        });
      }
    } catch (error) {
      console.error('Error loading client stats:', error);
    }
  };

  const handleSave = async () => {
    if (!client) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update({
          nombre: formData.nombre,
          email: formData.email || null,
          telefono: formData.telefono || null,
          direccion: formData.direccion || null,
          activo: formData.activo,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setClient(data);
        onClientUpdated?.(data);
        setIsEditing(false);
        toast.success('Cliente actualizado correctamente');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Error al actualizar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (client) {
      setFormData({
        nombre: client.nombre || '',
        email: client.email || '',
        telefono: client.telefono || '',
        direccion: client.direccion || '',
        activo: client.activo || true
      });
    }
    setIsEditing(false);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getClientSegment = (totalSpent: number) => {
    if (totalSpent >= 1000) return { label: 'VIP', color: 'bg-yellow-100 text-yellow-800' };
    if (totalSpent >= 500) return { label: 'Premium', color: 'bg-purple-100 text-purple-800' };
    if (totalSpent >= 100) return { label: 'Estándar', color: 'bg-blue-100 text-blue-800' };
    return { label: 'Nuevo', color: 'bg-gray-100 text-gray-800' };
  };

  if (loading && !client) {
    return (
      <Card className={`card-barplas ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-32"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientId) {
    return (
      <Card className={`card-barplas ${className}`}>
        <CardContent className="p-8 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Selecciona un cliente para ver sus detalles
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card className={`card-barplas ${className}`}>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Cliente no encontrado</p>
        </CardContent>
      </Card>
    );
  }

  const segment = clientStats ? getClientSegment(clientStats.totalSpent) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="card-barplas">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {client.nombre}
                  {segment && (
                    <Badge className={segment.color}>
                      {segment.label}
                    </Badge>
                  )}
                  <Badge variant={client.activo ? "default" : "secondary"}>
                    {client.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cliente desde {new Date(client.created_at).toLocaleDateString('es-ES', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{client.nombre}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{client.email || 'No proporcionado'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{client.telefono || 'No proporcionado'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activo">Estado</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2 p-2">
                      <Switch
                        id="activo"
                        checked={formData.activo}
                        onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                      />
                      <span>{formData.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className={`w-3 h-3 rounded-full ${client.activo ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{client.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                {isEditing ? (
                  <Textarea
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    rows={3}
                  />
                ) : (
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{client.direccion || 'No proporcionada'}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-4">
              {clientStats ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <ShoppingBag className="w-6 h-6 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Total Pedidos</p>
                      <p className="text-xl font-bold text-primary">
                        {clientStats.totalOrders}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                      <TrendingUp className="w-6 h-6 text-secondary mb-2" />
                      <p className="text-sm text-muted-foreground">Total Gastado</p>
                      <p className="text-xl font-bold text-secondary">
                        {formatCurrency(clientStats.totalSpent)}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                      <Star className="w-6 h-6 text-success mb-2" />
                      <p className="text-sm text-muted-foreground">Valor Promedio</p>
                      <p className="text-xl font-bold text-success">
                        {formatCurrency(clientStats.averageOrderValue)}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                      <Calendar className="w-6 h-6 text-warning mb-2" />
                      <p className="text-sm text-muted-foreground">Último Pedido</p>
                      <p className="text-sm font-bold text-warning">
                        {clientStats.lastOrderDate ? 
                          new Date(clientStats.lastOrderDate).toLocaleDateString('es-ES') :
                          'Nunca'
                        }
                      </p>
                    </div>
                  </div>

                  {clientStats.favoriteProducts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Productos Favoritos</h4>
                      <div className="flex flex-wrap gap-2">
                        {clientStats.favoriteProducts.map((product, index) => (
                          <Badge key={index} variant="outline">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No hay estadísticas disponibles
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tags" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Agregar tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} size="sm">
                  <Tag className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No hay tags asignados
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}