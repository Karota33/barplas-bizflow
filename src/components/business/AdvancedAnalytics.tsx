import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
  salesEvolution: Array<{
    month: string;
    sales: number;
    orders: number;
    growth: number;
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    quantity: number;
    revenue: number;
  }>;
  clientSegmentation: Array<{
    segment: string;
    clients: number;
    revenue: number;
    color: string;
  }>;
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    growth: number;
    trend: 'up' | 'down';
  };
}

export function AdvancedAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get sales evolution data
      const { data: salesData } = await supabase
        .from('pedidos')
        .select(`
          fecha_pedido,
          total,
          pedido_items (
            cantidad,
            precio_unitario,
            producto_id,
            productos (
              nombre
            )
          )
        `)
        .order('fecha_pedido', { ascending: true });

      if (salesData) {
        // Process sales evolution
        const salesEvolution = processSalesEvolution(salesData);
        
        // Process top products
        const topProducts = processTopProducts(salesData);
        
        // Process client segmentation
        const clientSegmentation = await processClientSegmentation();
        
        // Calculate monthly comparison
        const monthlyComparison = calculateMonthlyComparison(salesData);

        setAnalytics({
          salesEvolution,
          topProducts,
          clientSegmentation,
          monthlyComparison
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSalesEvolution = (data: any[]) => {
    const monthlyData = new Map();
    
    data.forEach(order => {
      const date = new Date(order.fecha_pedido);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { sales: 0, orders: 0 });
      }
      
      const current = monthlyData.get(monthKey);
      current.sales += parseFloat(order.total);
      current.orders += 1;
    });

    const sortedMonths = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months

    return sortedMonths.map(([monthKey, data], index, array) => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-ES', { month: 'short' });
      
      const growth = index > 0 ? 
        ((data.sales - array[index - 1][1].sales) / array[index - 1][1].sales) * 100 : 0;
      
      return {
        month: monthName,
        sales: data.sales,
        orders: data.orders,
        growth: Math.round(growth)
      };
    });
  };

  const processTopProducts = (data: any[]) => {
    const productStats = new Map();
    
    data.forEach(order => {
      order.pedido_items?.forEach((item: any) => {
        const productName = item.productos?.nombre || 'Producto desconocido';
        
        if (!productStats.has(productName)) {
          productStats.set(productName, { quantity: 0, revenue: 0, sales: 0 });
        }
        
        const current = productStats.get(productName);
        current.quantity += item.cantidad;
        current.revenue += item.cantidad * parseFloat(item.precio_unitario);
        current.sales += 1;
      });
    });

    return Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const processClientSegmentation = async () => {
    const { data: clientsData } = await supabase
      .from('clientes')
      .select(`
        id,
        nombre,
        pedidos (
          total
        )
      `);

    if (!clientsData) return [];

    const segments = [
      { name: 'VIP', min: 1000, color: '#009E40' },
      { name: 'Premium', min: 500, color: '#1863DC' },
      { name: 'Estándar', min: 100, color: '#FFA500' },
      { name: 'Nuevo', min: 0, color: '#808080' }
    ];

    const segmentData = segments.map(segment => ({
      segment: segment.name,
      clients: 0,
      revenue: 0,
      color: segment.color
    }));

    clientsData.forEach(client => {
      const totalRevenue = client.pedidos?.reduce((sum: number, order: any) => 
        sum + parseFloat(order.total), 0) || 0;
      
      const segment = segments.find(s => totalRevenue >= s.min) || segments[segments.length - 1];
      const segmentIndex = segments.indexOf(segment);
      
      segmentData[segmentIndex].clients += 1;
      segmentData[segmentIndex].revenue += totalRevenue;
    });

    return segmentData.filter(s => s.clients > 0);
  };

  const calculateMonthlyComparison = (data: any[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthData = data.filter(order => {
      const orderDate = new Date(order.fecha_pedido);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const previousMonthData = data.filter(order => {
      const orderDate = new Date(order.fecha_pedido);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return orderDate.getMonth() === prevMonth && orderDate.getFullYear() === prevYear;
    });

    const currentTotal = currentMonthData.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const previousTotal = previousMonthData.reduce((sum, order) => sum + parseFloat(order.total), 0);
    
    const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      currentMonth: currentTotal,
      previousMonth: previousTotal,
      growth: Math.round(growth),
      trend: growth >= 0 ? 'up' as const : 'down' as const
    };
  };

  if (loading) {
    return (
      <Card className="card-barplas">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Analytics Avanzados</h2>
          <p className="text-muted-foreground">Análisis detallado de tu negocio</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="3m">3M</TabsTrigger>
              <TabsTrigger value="6m">6M</TabsTrigger>
              <TabsTrigger value="12m">12M</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Monthly Comparison Cards */}
      {analytics?.monthlyComparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-barplas">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mes</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(analytics.monthlyComparison.currentMonth)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-barplas">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mes Anterior</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.monthlyComparison.previousMonth)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-barplas">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Crecimiento</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${
                      analytics.monthlyComparison.trend === 'up' ? 'text-success' : 'text-destructive'
                    }`}>
                      {analytics.monthlyComparison.growth}%
                    </p>
                    {analytics.monthlyComparison.trend === 'up' ? 
                      <TrendingUp className="w-5 h-5 text-success" /> :
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Tabs */}
      <Tabs defaultValue="evolution" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evolution">Evolución Ventas</TabsTrigger>
          <TabsTrigger value="products">Top Productos</TabsTrigger>
          <TabsTrigger value="clients">Segmentación</TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-4">
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle>Evolución de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics?.salesEvolution}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: any, name) => [
                      name === 'sales' ? formatCurrency(Number(value)) : value,
                      name === 'sales' ? 'Ventas' : 'Pedidos'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle>Top 5 Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics?.topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : Number(value))} />
                  <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle>Segmentación de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics?.clientSegmentation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment, clients }) => `${segment}: ${clients}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="clients"
                    >
                      {analytics?.clientSegmentation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  {analytics?.clientSegmentation.map((segment, index) => (
                    <motion.div
                      key={segment.segment}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <div>
                          <p className="font-medium">{segment.segment}</p>
                          <p className="text-sm text-muted-foreground">
                            {segment.clients} clientes
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {formatCurrency(segment.revenue)}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}