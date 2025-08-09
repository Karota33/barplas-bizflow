import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calculator, 
  FileText, 
  Mail, 
  Search,
  Plus,
  Minus,
  Send,
  Download,
  Zap,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  nombre: string;
  precio: number;
  sku: string;
}

interface QuoteItem {
  product: Product;
  quantity: number;
  discount: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export function BusinessTools() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick actions data
  const quickActions = [
    { icon: Calculator, label: "Nueva Cotización", action: () => clearQuote(), color: "bg-primary" },
    { icon: FileText, label: "Generar Reporte", action: () => {}, color: "bg-secondary" },
    { icon: Mail, label: "Email Cliente", action: () => {}, color: "bg-success" },
    { icon: TrendingUp, label: "Ver Analytics", action: () => {}, color: "bg-warning" },
  ];

  useEffect(() => {
    loadData();
    initializeEmailTemplates();
  }, []);

  const loadData = async () => {
    try {
      const { data: productsData } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (productsData) {
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const initializeEmailTemplates = () => {
    const templates: EmailTemplate[] = [
      {
        id: '1',
        name: 'Cotización Nueva',
        subject: 'Cotización BARPLAS - {{clientName}}',
        body: `Estimado/a {{clientName}},

Esperamos que se encuentre bien. Adjunto encontrará la cotización solicitada para los productos BARPLAS.

RESUMEN DE COTIZACIÓN:
- Total de productos: {{itemCount}}
- Subtotal: {{subtotal}}
- Descuentos aplicados: {{discount}}
- TOTAL: {{total}}

Esta cotización tiene una validez de 30 días naturales.

Para cualquier consulta, no dude en contactarnos.

Saludos cordiales,
Equipo Comercial BARPLAS`,
        variables: ['clientName', 'itemCount', 'subtotal', 'discount', 'total']
      },
      {
        id: '2',
        name: 'Seguimiento Pedido',
        subject: 'Estado de su pedido #{{orderNumber}} - BARPLAS',
        body: `Estimado/a {{clientName}},

Le informamos sobre el estado actual de su pedido:

PEDIDO: #{{orderNumber}}
ESTADO: {{orderStatus}}
FECHA ESTIMADA DE ENTREGA: {{deliveryDate}}

{{statusMessage}}

Gracias por confiar en BARPLAS.

Saludos cordiales,
Equipo Comercial BARPLAS`,
        variables: ['clientName', 'orderNumber', 'orderStatus', 'deliveryDate', 'statusMessage']
      },
      {
        id: '3',
        name: 'Bienvenida Cliente',
        subject: 'Bienvenido/a a BARPLAS - {{clientName}}',
        body: `¡Bienvenido/a a la familia BARPLAS!

Estimado/a {{clientName}},

Es un placer darle la bienvenida como nuevo cliente de BARPLAS. Estamos comprometidos a brindarle el mejor servicio y productos de calidad.

Su comercial asignado es: {{salesRep}}
Teléfono de contacto: {{phone}}
Email: {{email}}

No dude en contactarnos para cualquier consulta.

¡Esperamos una larga y exitosa relación comercial!

Saludos cordiales,
Equipo BARPLAS`,
        variables: ['clientName', 'salesRep', 'phone', 'email']
      }
    ];

    setEmailTemplates(templates);
  };

  // Quote Calculator Functions
  const addProductToQuote = (product: Product) => {
    const existingItem = quoteItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setQuoteItems(items => items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setQuoteItems(items => [...items, { product, quantity: 1, discount: 0 }]);
    }
    
    toast.success(`${product.nombre} agregado a la cotización`);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setQuoteItems(items => items.filter(item => item.product.id !== productId));
      return;
    }

    setQuoteItems(items => items.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateDiscount = (productId: string, discount: number) => {
    setQuoteItems(items => items.map(item =>
      item.product.id === productId
        ? { ...item, discount: Math.max(0, Math.min(100, discount)) }
        : item
    ));
  };

  const calculateQuoteTotal = () => {
    return quoteItems.reduce((total, item) => {
      const itemTotal = item.product.precio * item.quantity;
      const discountAmount = (itemTotal * item.discount) / 100;
      return total + (itemTotal - discountAmount);
    }, 0);
  };

  const clearQuote = () => {
    setQuoteItems([]);
    toast.success('Cotización limpiada');
  };

  const exportQuote = () => {
    toast.success('Cotización exportada a PDF');
    // Implement PDF generation logic
  };

  // Email Template Functions
  const replaceVariables = (template: string, variables: Record<string, string>) => {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  };

  const sendEmail = (template: EmailTemplate) => {
    // Mock email send
    toast.success(`Email "${template.name}" enviado correctamente`);
  };

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="card-barplas">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-20 bg-muted rounded"></div>
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
          <h2 className="text-2xl font-bold gradient-text">Herramientas Comerciales</h2>
          <p className="text-muted-foreground">Optimiza tu gestión comercial</p>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="card-barplas">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={action.action}
                className={`p-4 rounded-lg text-white transition-all hover:scale-105 hover:shadow-lg ${action.color}`}
              >
                <action.icon className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">{action.label}</p>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tools */}
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="templates">Templates Email</TabsTrigger>
          <TabsTrigger value="search">Búsqueda Global</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Search */}
            <Card className="card-barplas">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Calculadora de Presupuestos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Buscar Productos</Label>
                  <Input
                    placeholder="Nombre o SKU del producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{product.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku} • {formatCurrency(product.precio)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addProductToQuote(product)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quote Items */}
            <Card className="card-barplas">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Cotización Actual</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearQuote}>
                      Limpiar
                    </Button>
                    <Button size="sm" onClick={exportQuote}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {quoteItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay productos en la cotización
                  </p>
                ) : (
                  <>
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {quoteItems.map((item) => (
                        <motion.div
                          key={item.product.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-lg border bg-card space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.product.nombre}</p>
                            <Badge variant="secondary">
                              {formatCurrency(item.product.precio)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            
                            <Input
                              type="number"
                              placeholder="% Desc."
                              value={item.discount || ''}
                              onChange={(e) => updateDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                              className="w-20"
                              max={100}
                              min={0}
                            />
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Subtotal: {formatCurrency(
                                (item.product.precio * item.quantity) * (1 - item.discount / 100)
                              )}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold">TOTAL:</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(calculateQuoteTotal())}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template List */}
            <Card className="card-barplas">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Plantillas de Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {emailTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {template.subject}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Usar
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Template Preview */}
            <Card className="card-barplas">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Vista Previa</CardTitle>
                  {selectedTemplate && (
                    <Button 
                      size="sm"
                      onClick={() => sendEmail(selectedTemplate)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Asunto</Label>
                      <p className="p-2 bg-muted rounded text-sm">
                        {selectedTemplate.subject}
                      </p>
                    </div>
                    
                    <div>
                      <Label>Contenido</Label>
                      <div className="p-4 bg-muted rounded text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {selectedTemplate.body}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Variables disponibles</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTemplate.variables.map((variable) => (
                          <Badge key={variable} variant="outline">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Selecciona una plantilla para ver la vista previa
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Búsqueda Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Buscar clientes, productos, pedidos..."
                  className="text-lg"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2">Búsquedas Frecuentes</h4>
                    <div className="space-y-2">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        Clientes activos
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        Pedidos pendientes
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        Productos más vendidos
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2">Filtros Rápidos</h4>
                    <div className="space-y-2">
                      <Badge variant="outline">Último mes</Badge>
                      <Badge variant="outline">Estado: Activo</Badge>
                      <Badge variant="outline">Región: Norte</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2">Resultados</h4>
                    <p className="text-sm text-muted-foreground">
                      Escribe algo para comenzar la búsqueda
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}