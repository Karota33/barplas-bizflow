import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Star,
  Settings,
  Eye,
  Calendar,
  DollarSign,
  Package,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface DashboardStats {
  totalClientes: number;
  pedidosMes: number;
  ventasTotal: number;
  clienteMasActivo: string;
}

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  created_at: string;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  fecha_pedido: string;
  total: number;
  estado: string;
  cliente_nombre: string;
}

export function BusinessDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    pedidosMes: 0,
    ventasTotal: 0,
    clienteMasActivo: ""
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [comercial, setComercial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Load comercial data
      const { data: comercialData } = await supabase
        .from('comerciales')
        .select('*')
        .eq('id', user.id)
        .single();

      setComercial(comercialData);

      // Load clients
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*')
        .eq('comercial_id', user.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      setClientes(clientesData || []);

      // Load orders with client names
      const { data: pedidosData } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes!inner(nombre)
        `)
        .eq('clientes.comercial_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const pedidosFormatted = pedidosData?.map(p => ({
        id: p.id,
        numero_pedido: p.numero_pedido,
        fecha_pedido: p.fecha_pedido,
        total: p.total,
        estado: p.estado,
        cliente_nombre: (p.clientes as any)?.nombre || 'Cliente desconocido'
      })) || [];

      setPedidos(pedidosFormatted);

      // Calculate stats
      const totalClientes = clientesData?.length || 0;
      
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const pedidosMes = pedidosData?.filter(p => 
        new Date(p.fecha_pedido) >= inicioMes
      ).length || 0;

      const ventasTotal = pedidosData?.reduce((sum, p) => sum + Number(p.total), 0) || 0;

      // Find most active client
      const clientePedidos: { [key: string]: number } = {};
      pedidosData?.forEach(p => {
        const clienteNombre = (p.clientes as any)?.nombre;
        if (clienteNombre) {
          clientePedidos[clienteNombre] = (clientePedidos[clienteNombre] || 0) + 1;
        }
      });

      const clienteMasActivo = Object.entries(clientePedidos)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "Sin datos";

      setStats({
        totalClientes,
        pedidosMes,
        ventasTotal,
        clienteMasActivo
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Sample chart data
  const ventasData = [
    { mes: 'Ene', ventas: 4500 },
    { mes: 'Feb', ventas: 5200 },
    { mes: 'Mar', ventas: 4800 },
    { mes: 'Abr', ventas: 6100 },
    { mes: 'May', ventas: 5900 },
    { mes: 'Jun', ventas: 6800 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">Portal BARPLAS</h1>
              <p className="text-muted-foreground">Bienvenido, {comercial?.nombre}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary count-up">{stats.totalClientes}</div>
              <p className="text-xs text-muted-foreground">
                Clientes activos asignados
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos del Mes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary count-up">{stats.pedidosMes}</div>
              <p className="text-xs text-muted-foreground">
                Pedidos en {new Date().toLocaleDateString('es-ES', { month: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success count-up">
                {formatCurrency(stats.ventasTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                Acumulado histórico
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cliente Top</CardTitle>
              <Star className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-warning truncate">{stats.clienteMasActivo}</div>
              <p className="text-xs text-muted-foreground">
                Más pedidos realizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="clientes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes">Mis Clientes</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos Recientes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="space-y-4">
            <Card className="card-barplas">
              <CardHeader>
                <CardTitle>Mis Clientes ({clientes.length})</CardTitle>
                <CardDescription>
                  Gestiona tus clientes asignados y sus catálogos personalizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No tienes clientes asignados
                    </p>
                  ) : (
                    clientes.map((cliente) => (
                      <div key={cliente.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold">{cliente.nombre}</h3>
                          <p className="text-sm text-muted-foreground">{cliente.email}</p>
                          {cliente.telefono && (
                            <p className="text-sm text-muted-foreground">{cliente.telefono}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={cliente.activo ? "default" : "secondary"}>
                            {cliente.activo ? "Activo" : "Inactivo"}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/client/${cliente.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Portal
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/catalog/${cliente.id}`)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Gestionar Catálogo
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pedidos" className="space-y-4">
            <Card className="card-barplas">
              <CardHeader>
                <CardTitle>Pedidos Recientes</CardTitle>
                <CardDescription>
                  Últimos pedidos realizados por tus clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pedidos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay pedidos registrados
                    </p>
                  ) : (
                    pedidos.map((pedido) => (
                      <div key={pedido.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold">{pedido.numero_pedido}</h3>
                          <p className="text-sm text-muted-foreground">{pedido.cliente_nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pedido.fecha_pedido).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(pedido.total)}</p>
                            <Badge variant={
                              pedido.estado === 'confirmado' ? 'default' :
                              pedido.estado === 'pendiente' ? 'secondary' :
                              pedido.estado === 'enviado' ? 'default' : 'destructive'
                            }>
                              {pedido.estado.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-barplas">
                <CardHeader>
                  <CardTitle>Evolución de Ventas</CardTitle>
                  <CardDescription>Ventas mensuales en los últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ventasData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line 
                        type="monotone" 
                        dataKey="ventas" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="card-barplas">
                <CardHeader>
                  <CardTitle>Comparativa Mensual</CardTitle>
                  <CardDescription>Ventas por mes en formato de barras</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ventasData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar 
                        dataKey="ventas" 
                        fill="hsl(var(--secondary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}