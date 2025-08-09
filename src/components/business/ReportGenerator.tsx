import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Package, 
  DollarSign,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: any;
  template: string;
}

interface ReportData {
  summary: {
    totalSales: number;
    totalOrders: number;
    totalClients: number;
    avgOrderValue: number;
  };
  topProducts: Array<{
    name: string;
    sales: number;
    quantity: number;
  }>;
  clientSales: Array<{
    clientName: string;
    totalSales: number;
    orderCount: number;
  }>;
  monthlySales: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'sales-summary',
    name: 'Resumen de Ventas',
    description: 'Análisis completo de ventas por período',
    icon: DollarSign,
    template: 'sales'
  },
  {
    id: 'client-report',
    name: 'Reporte de Clientes',
    description: 'Performance y análisis de clientes',
    icon: Users,
    template: 'clients'
  },
  {
    id: 'product-analysis',
    name: 'Análisis de Productos',
    description: 'Top productos y tendencias',
    icon: Package,
    template: 'products'
  },
  {
    id: 'monthly-trends',
    name: 'Tendencias Mensuales',
    description: 'Evolución de ventas mes a mes',
    icon: TrendingUp,
    template: 'trends'
  }
];

export function ReportGenerator() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState<{from: Date, to: Date} | undefined>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateReportData = async () => {
    if (!selectedReportType || !dateRange?.from || !dateRange?.to) {
      toast.error('Selecciona el tipo de reporte y el rango de fechas');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch orders within date range
      const { data: ordersData } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes!inner (
            nombre,
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
        .gte('fecha_pedido', dateRange.from.toISOString())
        .lte('fecha_pedido', dateRange.to.toISOString())
        .order('fecha_pedido', { ascending: false });

      if (ordersData) {
        const data = processReportData(ordersData);
        setReportData(data);
        toast.success('Reporte generado correctamente');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (orders: any[]): ReportData => {
    const summary = {
      totalSales: orders.reduce((sum, order) => sum + parseFloat(order.total), 0),
      totalOrders: orders.length,
      totalClients: new Set(orders.map(order => order.cliente_id)).size,
      avgOrderValue: 0
    };
    summary.avgOrderValue = summary.totalOrders > 0 ? summary.totalSales / summary.totalOrders : 0;

    // Process top products
    const productStats = new Map();
    orders.forEach(order => {
      order.pedido_items?.forEach((item: any) => {
        const productName = item.productos?.nombre || 'Producto desconocido';
        
        if (!productStats.has(productName)) {
          productStats.set(productName, { sales: 0, quantity: 0 });
        }
        
        const current = productStats.get(productName);
        current.sales += item.cantidad * parseFloat(item.precio_unitario);
        current.quantity += item.cantidad;
      });
    });

    const topProducts = Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // Process client sales
    const clientStats = new Map();
    orders.forEach(order => {
      const clientName = order.clientes?.nombre || 'Cliente desconocido';
      
      if (!clientStats.has(clientName)) {
        clientStats.set(clientName, { totalSales: 0, orderCount: 0 });
      }
      
      const current = clientStats.get(clientName);
      current.totalSales += parseFloat(order.total);
      current.orderCount += 1;
    });

    const clientSales = Array.from(clientStats.entries())
      .map(([clientName, stats]) => ({ clientName, ...stats }))
      .sort((a, b) => b.totalSales - a.totalSales);

    // Process monthly sales
    const monthlyStats = new Map();
    orders.forEach(order => {
      const date = new Date(order.fecha_pedido);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, { sales: 0, orders: 0 });
      }
      
      const current = monthlyStats.get(monthKey);
      current.sales += parseFloat(order.total);
      current.orders += 1;
    });

    const monthlySales = Array.from(monthlyStats.entries())
      .map(([monthKey, stats]) => {
        const [year, month] = monthKey.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-ES', { 
          month: 'long', 
          year: 'numeric' 
        });
        return { month: monthName, ...stats };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary,
      topProducts,
      clientSales,
      monthlySales
    };
  };

  const exportToPDF = async () => {
    if (!reportData || !selectedReportType) return;

    setGenerating(true);
    try {
      const pdf = new jsPDF();
      
      // Add BARPLAS header
      pdf.setFontSize(20);
      pdf.setTextColor(0, 158, 64); // BARPLAS Green
      pdf.text('BARPLAS', 20, 30);
      
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(selectedReportType.name, 20, 45);
      
      if (dateRange) {
        pdf.setFontSize(12);
        pdf.text(`Período: ${dateRange.from.toLocaleDateString('es-ES')} - ${dateRange.to.toLocaleDateString('es-ES')}`, 20, 55);
      }

      // Add summary section
      let yPosition = 75;
      pdf.setFontSize(14);
      pdf.text('Resumen Ejecutivo', 20, yPosition);
      
      yPosition += 15;
      pdf.setFontSize(11);
      pdf.text(`Total Ventas: ${formatCurrency(reportData.summary.totalSales)}`, 20, yPosition);
      
      yPosition += 10;
      pdf.text(`Total Pedidos: ${reportData.summary.totalOrders}`, 20, yPosition);
      
      yPosition += 10;
      pdf.text(`Total Clientes: ${reportData.summary.totalClients}`, 20, yPosition);
      
      yPosition += 10;
      pdf.text(`Valor Promedio Pedido: ${formatCurrency(reportData.summary.avgOrderValue)}`, 20, yPosition);

      // Add top products section
      if (reportData.topProducts.length > 0) {
        yPosition += 25;
        pdf.setFontSize(14);
        pdf.text('Top 5 Productos', 20, yPosition);
        
        reportData.topProducts.slice(0, 5).forEach((product, index) => {
          yPosition += 15;
          pdf.setFontSize(11);
          pdf.text(`${index + 1}. ${product.name}`, 20, yPosition);
          pdf.text(`Ventas: ${formatCurrency(product.sales)} | Cantidad: ${product.quantity}`, 25, yPosition + 8);
          yPosition += 8;
        });
      }

      // Add client sales section
      if (reportData.clientSales.length > 0) {
        yPosition += 25;
        
        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 30;
        }
        
        pdf.setFontSize(14);
        pdf.text('Top 5 Clientes', 20, yPosition);
        
        reportData.clientSales.slice(0, 5).forEach((client, index) => {
          yPosition += 15;
          pdf.setFontSize(11);
          pdf.text(`${index + 1}. ${client.clientName}`, 20, yPosition);
          pdf.text(`Ventas: ${formatCurrency(client.totalSales)} | Pedidos: ${client.orderCount}`, 25, yPosition + 8);
          yPosition += 8;
        });
      }

      // Save the PDF
      pdf.save(`reporte-barplas-${Date.now()}.pdf`);
      toast.success('Reporte PDF generado correctamente');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add summary
    csvContent += "RESUMEN EJECUTIVO\n";
    csvContent += `Total Ventas,${reportData.summary.totalSales}\n`;
    csvContent += `Total Pedidos,${reportData.summary.totalOrders}\n`;
    csvContent += `Total Clientes,${reportData.summary.totalClients}\n`;
    csvContent += `Valor Promedio Pedido,${reportData.summary.avgOrderValue}\n\n`;
    
    // Add top products
    csvContent += "TOP PRODUCTOS\n";
    csvContent += "Producto,Ventas,Cantidad\n";
    reportData.topProducts.forEach(product => {
      csvContent += `${product.name},${product.sales},${product.quantity}\n`;
    });
    
    csvContent += "\n";
    
    // Add client sales
    csvContent += "VENTAS POR CLIENTE\n";
    csvContent += "Cliente,Total Ventas,Número Pedidos\n";
    reportData.clientSales.forEach(client => {
      csvContent += `${client.clientName},${client.totalSales},${client.orderCount}\n`;
    });

    // Download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte-barplas-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Reporte CSV generado correctamente');
  };

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
          <h2 className="text-2xl font-bold gradient-text">Generador de Reportes</h2>
          <p className="text-muted-foreground">Crea reportes profesionales personalizados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Report Type Selection */}
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tipo de Reporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {REPORT_TYPES.map((reportType) => {
                const Icon = reportType.icon;
                return (
                  <motion.div
                    key={reportType.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedReportType?.id === reportType.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedReportType(reportType)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{reportType.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reportType.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Date Range Selection */}
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Período del Reporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Rango de Fechas</Label>
                <DatePickerWithRange
                  value={dateRange}
                  onChange={(range) => setDateRange(range as {from: Date, to: Date})}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={generateReportData}
                disabled={loading || !selectedReportType || !dateRange}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Generar Reporte
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview & Export */}
        <div className="lg:col-span-2 space-y-6">
          {reportData ? (
            <>
              {/* Export Options */}
              <Card className="card-barplas">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Exportar Reporte</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={exportToExcel}
                        disabled={generating}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                      <Button 
                        onClick={exportToPDF}
                        disabled={generating}
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Report Preview */}
              <Card className="card-barplas">
                <CardHeader>
                  <CardTitle>Vista Previa del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <DollarSign className="w-8 h-8 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Total Ventas</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(reportData.summary.totalSales)}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                      <Package className="w-8 h-8 text-secondary mb-2" />
                      <p className="text-sm text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold text-secondary">
                        {reportData.summary.totalOrders}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                      <Users className="w-8 h-8 text-success mb-2" />
                      <p className="text-sm text-muted-foreground">Clientes</p>
                      <p className="text-xl font-bold text-success">
                        {reportData.summary.totalClients}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                      <TrendingUp className="w-8 h-8 text-warning mb-2" />
                      <p className="text-sm text-muted-foreground">Promedio</p>
                      <p className="text-xl font-bold text-warning">
                        {formatCurrency(reportData.summary.avgOrderValue)}
                      </p>
                    </div>
                  </div>

                  {/* Top Products */}
                  {reportData.topProducts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top 5 Productos</h3>
                      <div className="space-y-3">
                        {reportData.topProducts.slice(0, 5).map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">{index + 1}</Badge>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Cantidad vendida: {product.quantity}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-primary">
                              {formatCurrency(product.sales)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Clients */}
                  {reportData.clientSales.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top 5 Clientes</h3>
                      <div className="space-y-3">
                        {reportData.clientSales.slice(0, 5).map((client, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">{index + 1}</Badge>
                              <div>
                                <p className="font-medium">{client.clientName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {client.orderCount} pedidos
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-primary">
                              {formatCurrency(client.totalSales)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="card-barplas">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Genera tu Primer Reporte</h3>
                <p className="text-muted-foreground">
                  Selecciona el tipo de reporte y el período para comenzar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}