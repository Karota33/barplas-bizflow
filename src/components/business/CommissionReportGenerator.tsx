import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, TrendingUp, DollarSign, Package, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommissionReport {
  periodo: string;
  total_ventas: number;
  comision_percentage: number;
  comision_total: number;
  pedidos_count: number;
  clientes_atendidos: number;
  detalles: Array<{
    pedido_numero: string;
    cliente: string;
    fecha: string;
    total: number;
    comision: number;
    estado: string;
  }>;
}

export const CommissionReportGenerator: React.FC = () => {
  const [reportType, setReportType] = useState<'comisiones' | 'ventas' | 'stock' | 'entregas'>('comisiones');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentReport, setCurrentReport] = useState<CommissionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateOperationalReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Selecciona fechas de inicio y fin",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get orders in date range
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          total,
          fecha_pedido,
          estado,
          clientes (
            nombre,
            comercial_id
          )
        `)
        .gte('fecha_pedido', startDate)
        .lte('fecha_pedido', endDate + 'T23:59:59')
        .eq('estado', 'entregado');

      if (error) throw error;

      // Calculate commission report
      const totalVentas = pedidos?.reduce((sum, pedido) => sum + Number(pedido.total), 0) || 0;
      const comisionRate = 0.05; // 5% commission rate
      const comisionTotal = totalVentas * comisionRate;
      
      const clientesUnicos = new Set(pedidos?.map(p => (p as any).clientes?.nombre)).size;
      
      const detalles = pedidos?.map(pedido => ({
        pedido_numero: pedido.numero_pedido,
        cliente: (pedido as any).clientes?.nombre || 'N/A',
        fecha: new Date(pedido.fecha_pedido).toLocaleDateString(),
        total: Number(pedido.total),
        comision: Number(pedido.total) * comisionRate,
        estado: pedido.estado
      })) || [];

      const report: CommissionReport = {
        periodo: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        total_ventas: totalVentas,
        comision_percentage: comisionRate * 100,
        comision_total: comisionTotal,
        pedidos_count: pedidos?.length || 0,
        clientes_atendidos: clientesUnicos,
        detalles
      };

      setCurrentReport(report);

      toast({
        title: "Reporte generado",
        description: `Reporte de ${reportType} generado exitosamente`,
      });

    } catch (error: any) {
      toast({
        title: "Error generando reporte",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCommissionReport = () => {
    if (!currentReport) return;

    const csvContent = [
      ['Período', 'Total Ventas', 'Comisión %', 'Comisión Total', 'Pedidos', 'Clientes'],
      [
        currentReport.periodo,
        currentReport.total_ventas.toFixed(2),
        currentReport.comision_percentage.toFixed(1),
        currentReport.comision_total.toFixed(2),
        currentReport.pedidos_count.toString(),
        currentReport.clientes_atendidos.toString()
      ],
      [''],
      ['Pedido', 'Cliente', 'Fecha', 'Total', 'Comisión', 'Estado'],
      ...currentReport.detalles.map(detalle => [
        detalle.pedido_numero,
        detalle.cliente,
        detalle.fecha,
        detalle.total.toFixed(2),
        detalle.comision.toFixed(2),
        detalle.estado
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Generador de Reportes Operativos</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Configuración del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Reporte:</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comisiones">Comisiones</SelectItem>
                  <SelectItem value="ventas">Ventas</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="entregas">Entregas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateOperationalReport}
                disabled={loading || !startDate || !endDate}
                className="w-full"
              >
                {loading ? 'Generando...' : 'Generar Reporte'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ventas</p>
                    <p className="font-semibold">€{currentReport.total_ventas.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comisión Total</p>
                    <p className="font-semibold">€{currentReport.comision_total.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded">
                    <Package className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="font-semibold">{currentReport.pedidos_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                    <p className="font-semibold">{currentReport.clientes_atendidos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Report */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detalle del Reporte - {currentReport.periodo}</CardTitle>
                <Button onClick={exportCommissionReport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReport.detalles.map((detalle, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{detalle.pedido_numero}</TableCell>
                      <TableCell>{detalle.cliente}</TableCell>
                      <TableCell>{detalle.fecha}</TableCell>
                      <TableCell>€{detalle.total.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        €{detalle.comision.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50">
                          {detalle.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};