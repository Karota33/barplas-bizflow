import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  UserPlus,
  PackagePlus,
  Eye,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminStats {
  totalComerciales: number;
  comercialesActivos: number;
  totalClientes: number;
  totalProductos: number;
  productosActivos: number;
  pedidosPendientes: number;
  ventasMes: number;
}

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalComerciales: 0,
    comercialesActivos: 0,
    totalClientes: 0,
    totalProductos: 0,
    productosActivos: 0,
    pedidosPendientes: 0,
    ventasMes: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
      loadRecentActivities();
    }
  }, [isAdmin]);

  const loadAdminStats = async () => {
    try {
      // Estadísticas de comerciales
      const { data: comerciales } = await supabase
        .from('comerciales')
        .select('activo');
      
      // Estadísticas de clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id');
      
      // Estadísticas de productos
      const { data: productos } = await supabase
        .from('productos')
        .select('activo');
      
      // Pedidos pendientes
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('total, created_at')
        .in('estado', ['pendiente', 'revision']);

      // Ventas del mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const { data: ventasMes } = await supabase
        .from('pedidos')
        .select('total')
        .gte('created_at', inicioMes.toISOString())
        .eq('estado', 'entregado');

      const ventasTotal = ventasMes?.reduce((sum, pedido) => sum + Number(pedido.total), 0) || 0;

      setStats({
        totalComerciales: comerciales?.length || 0,
        comercialesActivos: comerciales?.filter(c => c.activo).length || 0,
        totalClientes: clientes?.length || 0,
        totalProductos: productos?.length || 0,
        productosActivos: productos?.filter(p => p.activo).length || 0,
        pedidosPendientes: pedidos?.length || 0,
        ventasMes: ventasTotal
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          estado,
          total,
          created_at,
          clientes (nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivities(pedidos || []);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Panel Administrativo</h1>
            <p className="text-muted-foreground mt-1">Gestión completa del sistema BARPLAS</p>
          </div>
          <Badge variant="outline" className="bg-primary/10">
            Admin: {user?.nombre}
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Comerciales</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.comercialesActivos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalComerciales} total ({stats.comercialesActivos} activos)
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClientes}</div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productosActivos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalProductos} total ({stats.productosActivos} activos)
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pedidosPendientes}</div>
              <p className="text-xs text-muted-foreground">Por procesar</p>
            </CardContent>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/comerciales">
            <Button className="w-full h-16 btn-barplas">
              <div className="text-center">
                <UserPlus className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Gestionar Comerciales</div>
              </div>
            </Button>
          </Link>

          <Link to="/admin/productos">
            <Button className="w-full h-16 btn-barplas">
              <div className="text-center">
                <PackagePlus className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Gestionar Productos</div>
              </div>
            </Button>
          </Link>

          <Link to="/clientes">
            <Button className="w-full h-16 btn-barplas-outline">
              <div className="text-center">
                <Eye className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Ver Todos los Clientes</div>
              </div>
            </Button>
          </Link>

          <Link to="/dashboard">
            <Button className="w-full h-16 btn-barplas-outline">
              <div className="text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Reportes Globales</div>
              </div>
            </Button>
          </Link>
        </div>

        {/* Actividad reciente */}
        <Card className="card-barplas">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{activity.numero_pedido}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {activity.clientes?.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">€{Number(activity.total).toFixed(2)}</div>
                    <Badge variant="outline" className="text-xs">
                      {activity.estado}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}