import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  UserPlus, 
  Edit3, 
  Mail, 
  Phone,
  MapPin,
  Calendar,
  Building2,
  Search,
  Eye,
  ShoppingCart
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Cliente {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  tipo: string;
  notas?: string;
  logo_url?: string;
  activo: boolean;
  comercial_id?: string;
  created_at: string;
  updated_at: string;
  // Relación con comercial
  comerciales?: {
    nombre: string;
  };
  // Conteo de pedidos
  pedidos_count?: number;
}

interface Comercial {
  id: string;
  nombre: string;
}

const TIPOS_CLIENTE = [
  'Minorista',
  'Mayorista',
  'Distribuidor',
  'Fabricante',
  'Institución',
  'Otros'
];

export function EnhancedClientManager() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Cliente[]>([]);
  const [comerciales, setComerciales] = useState<Comercial[]>([]);
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    tipo: 'Minorista',
    notas: '',
    logo_url: '',
    activo: true,
    comercial_id: ''
  });

  useEffect(() => {
    loadClients();
    if (isAdmin) {
      loadComerciales();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const loadClients = async () => {
    try {
      let query = supabase
        .from('clientes')
        .select(`
          *,
          comerciales (nombre),
          pedidos (count)
        `)
        .order('nombre');

      // Si no es admin, solo mostrar sus clientes
      if (!isAdmin && user?.id) {
        query = query.eq('comercial_id', user.id);
      }

      const { data } = await query;

      const clientsWithCount = data?.map(client => ({
        ...client,
        pedidos_count: client.pedidos?.[0]?.count || 0
      })) || [];

      setClients(clientsWithCount);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "Error al cargar los clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComerciales = async () => {
    try {
      const { data } = await supabase
        .from('comerciales')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      setComerciales(data || []);
    } catch (error) {
      console.error('Error loading comerciales:', error);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.telefono && client.telefono.includes(searchTerm))
      );
    }

    if (statusFilter === 'activo') {
      filtered = filtered.filter(client => client.activo);
    } else if (statusFilter === 'inactivo') {
      filtered = filtered.filter(client => !client.activo);
    }

    setFilteredClients(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientData = {
        ...formData,
        comercial_id: formData.comercial_id || user?.id,
        updated_at: new Date().toISOString()
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clientes')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Cliente actualizado correctamente"
        });
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert(clientData);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Cliente creado correctamente"
        });
      }

      setDialogOpen(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al procesar la solicitud",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Cliente) => {
    setEditingClient(client);
    setFormData({
      nombre: client.nombre,
      email: client.email || '',
      telefono: client.telefono || '',
      direccion: client.direccion || '',
      tipo: client.tipo,
      notas: client.notas || '',
      logo_url: client.logo_url || '',
      activo: client.activo,
      comercial_id: client.comercial_id || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente"
      });
      
      loadClients();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el cliente",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      tipo: 'Minorista',
      notas: '',
      logo_url: '',
      activo: true,
      comercial_id: ''
    });
  };

  const openNewClientDialog = () => {
    setEditingClient(null);
    resetForm();
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              {isAdmin ? 'Gestión de Clientes' : 'Mis Clientes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? 'Administra todos los clientes del sistema' 
                : 'Gestiona tu cartera de clientes'
              }
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-barplas" onClick={openNewClientDialog}>
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la empresa *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de cliente</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({...formData, tipo: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CLIENTE.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Textarea
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    rows={2}
                  />
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="comercial">Comercial asignado</Label>
                    <Select
                      value={formData.comercial_id}
                      onValueChange={(value) => setFormData({...formData, comercial_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar comercial" />
                      </SelectTrigger>
                      <SelectContent>
                        {comerciales.map((comercial) => (
                          <SelectItem key={comercial.id} value={comercial.id}>
                            {comercial.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                    rows={3}
                    placeholder="Información adicional sobre el cliente..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo de la empresa</Label>
                  <ImageUpload
                    bucket="clients"
                    path="logos"
                    onUpload={(url) => setFormData({...formData, logo_url: url})}
                    currentImage={formData.logo_url}
                    maxWidth={200}
                    maxHeight={200}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                  />
                  <Label htmlFor="activo">Cliente activo</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-barplas" disabled={loading}>
                    {editingClient ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card className="card-barplas">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="activo">Solo activos</SelectItem>
                    <SelectItem value="inactivo">Solo inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de clientes */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="card-barplas">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                        {client.logo_url ? (
                          <img 
                            src={client.logo_url} 
                            alt={`Logo de ${client.nombre}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">{client.nombre}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {client.tipo}
                        </Badge>
                      </div>
                    </div>
                    <StatusBadge status={client.activo ? 'Activo' : 'Inactivo'} />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {client.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.telefono && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                        {client.telefono}
                      </div>
                    )}
                    {client.direccion && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{client.direccion}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      Cliente desde {new Date(client.created_at).toLocaleDateString()}
                    </div>
                    {isAdmin && client.comerciales && (
                      <div className="flex items-center text-sm">
                        <Badge variant="outline">
                          Comercial: {client.comerciales.nombre}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center text-sm">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    <span>{client.pedidos_count || 0} pedidos realizados</span>
                  </div>

                  {client.notas && (
                    <div className="text-sm text-muted-foreground line-clamp-2 p-2 bg-muted/30 rounded">
                      {client.notas}
                    </div>
                  )}

                  <div className="flex justify-between gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      
                      <Link to={`/client/${client.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    
                    <ConfirmDialog
                      title="Eliminar Cliente"
                      description={`¿Estás seguro de que deseas eliminar a "${client.nombre}"? Esta acción no se puede deshacer.`}
                      onConfirm={() => handleDelete(client.id)}
                      destructive
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredClients.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || statusFilter ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza agregando tu primer cliente al sistema.'
                }
              </p>
              {!searchTerm && !statusFilter && (
                <Button className="btn-barplas" onClick={openNewClientDialog}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Primer Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}