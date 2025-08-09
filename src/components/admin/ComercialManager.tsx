import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { 
  UserPlus, 
  Edit3, 
  Mail, 
  Phone,
  MapPin,
  Calendar,
  Users
} from 'lucide-react';

interface Comercial {
  id: string;
  nombre: string;
  email: string;
  role: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  // Clientes asignados count
  clientes_count?: number;
}

export function ComercialManager() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [comerciales, setComerciales] = useState<Comercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComercial, setEditingComercial] = useState<Comercial | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    role: 'comercial',
    activo: true
  });

  useEffect(() => {
    if (isAdmin) {
      loadComerciales();
    }
  }, [isAdmin]);

  const loadComerciales = async () => {
    try {
      const { data: comercialesData } = await supabase
        .from('comerciales')
        .select(`
          *,
          clientes:clientes(count)
        `)
        .order('nombre');

      // Transform data to include client count
      const comercialesWithCount = comercialesData?.map(comercial => ({
        ...comercial,
        clientes_count: comercial.clientes?.[0]?.count || 0
      })) || [];

      setComerciales(comercialesWithCount);
    } catch (error) {
      console.error('Error loading comerciales:', error);
      toast({
        title: "Error",
        description: "Error al cargar los comerciales",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingComercial) {
        const { error } = await supabase
          .from('comerciales')
          .update({
            nombre: formData.nombre,
            email: formData.email,
            role: formData.role,
            activo: formData.activo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingComercial.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Comercial actualizado correctamente"
        });
      } else {
        // For new comercial, we need to create auth user first
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: 'temporal123', // Should be changed on first login
          email_confirm: true
        });

        if (authError) throw authError;

        // Create comercial record
        const { error } = await supabase
          .from('comerciales')
          .insert({
            id: authData.user.id,
            nombre: formData.nombre,
            email: formData.email,
            role: formData.role,
            activo: formData.activo
          });

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Comercial creado correctamente. Contraseña temporal: temporal123"
        });
      }

      setDialogOpen(false);
      setEditingComercial(null);
      setFormData({ nombre: '', email: '', role: 'comercial', activo: true });
      loadComerciales();
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

  const handleEdit = (comercial: Comercial) => {
    setEditingComercial(comercial);
    setFormData({
      nombre: comercial.nombre,
      email: comercial.email,
      role: comercial.role,
      activo: comercial.activo
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comerciales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Comercial eliminado correctamente"
      });
      
      loadComerciales();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el comercial",
        variant: "destructive"
      });
    }
  };

  const openNewComercialDialog = () => {
    setEditingComercial(null);
    setFormData({ nombre: '', email: '', role: 'comercial', activo: true });
    setDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
              <p className="text-muted-foreground">No tienes permisos de administrador.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Gestión de Comerciales</h1>
            <p className="text-muted-foreground mt-1">Administra el equipo comercial de BARPLAS</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-barplas" onClick={openNewComercialDialog}>
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Comercial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingComercial ? 'Editar Comercial' : 'Nuevo Comercial'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    disabled={!!editingComercial}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                  />
                  <Label htmlFor="activo">Activo</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-barplas" disabled={loading}>
                    {editingComercial ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de comerciales */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comerciales.map((comercial) => (
              <Card key={comercial.id} className="card-barplas">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{comercial.nombre}</CardTitle>
                    <StatusBadge status={comercial.activo ? 'Activo' : 'Inactivo'} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2" />
                      {comercial.email}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      {comercial.clientes_count || 0} clientes asignados
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      Desde {new Date(comercial.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Badge variant={comercial.role === 'admin' ? 'default' : 'outline'}>
                      {comercial.role}
                    </Badge>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(comercial)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      
                      <ConfirmDialog
                        title="Eliminar Comercial"
                        description={`¿Estás seguro de que deseas eliminar a ${comercial.nombre}? Esta acción no se puede deshacer.`}
                        onConfirm={() => handleDelete(comercial.id)}
                        destructive
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {comerciales.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay comerciales registrados</h3>
              <p className="text-muted-foreground mb-4">
                Comienza agregando el primer comercial al sistema.
              </p>
              <Button className="btn-barplas" onClick={openNewComercialDialog}>
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Primer Comercial
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}