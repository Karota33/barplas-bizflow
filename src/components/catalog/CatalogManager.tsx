import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Package, 
  Eye, 
  Save, 
  ArrowLeft,
  CheckCircle,
  Settings,
  Filter,
  Grid,
  List
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CountUp from 'react-countup';

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  url_imagen: string;
  activo: boolean;
}

interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

interface CatalogoItem {
  id: string;
  producto_id: string;
  activo: boolean;
}

export function CatalogManager() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [catalogoItems, setCatalogoItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      // Load client info
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clientId)
        .single();

      if (!clienteData) {
        toast({
          title: "Error",
          description: "Cliente no encontrado",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      setCliente(clienteData);

      // Load all products
      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      setProductos(productosData || []);

      // Load current catalog configuration
      const { data: catalogoData } = await supabase
        .from('catalogos_clientes')
        .select('*')
        .eq('cliente_id', clientId);

      setCatalogoItems(catalogoData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isProductInCatalog = (productId: string): boolean => {
    return catalogoItems.some(item => item.producto_id === productId && item.activo);
  };

  const toggleProduct = async (productId: string) => {
    const isCurrentlyInCatalog = isProductInCatalog(productId);
    
    try {
      if (isCurrentlyInCatalog) {
        // Remove from catalog
        await supabase
          .from('catalogos_clientes')
          .update({ activo: false })
          .eq('cliente_id', clientId)
          .eq('producto_id', productId);
      } else {
        // Add to catalog
        const { error } = await supabase
          .from('catalogos_clientes')
          .upsert({
            cliente_id: clientId!,
            producto_id: productId,
            activo: true
          });
        
        if (error) throw error;
      }

      // Refresh catalog data
      await loadData();

      const producto = productos.find(p => p.id === productId);
      toast({
        title: isCurrentlyInCatalog ? "Producto removido" : "Producto agregado",
        description: `${producto?.nombre} ${isCurrentlyInCatalog ? 'removido del' : 'agregado al'} catálogo`,
      });

    } catch (error) {
      console.error('Error updating catalog:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el catálogo",
        variant: "destructive"
      });
    }
  };

  const handleBulkToggle = async (enable: boolean) => {
    setSaving(true);
    try {
      const productIds = filteredProducts.map(p => p.id);
      
      if (enable) {
        // Add all filtered products
        const upsertData = productIds.map(productId => ({
          cliente_id: clientId!,
          producto_id: productId,
          activo: true
        }));
        
        await supabase
          .from('catalogos_clientes')
          .upsert(upsertData);
      } else {
        // Remove all filtered products
        await supabase
          .from('catalogos_clientes')
          .update({ activo: false })
          .eq('cliente_id', clientId)
          .in('producto_id', productIds);
      }

      await loadData();
      
      toast({
        title: enable ? "Productos agregados" : "Productos removidos",
        description: `Se ${enable ? 'agregaron' : 'removieron'} ${productIds.length} productos`,
      });

    } catch (error) {
      console.error('Error in bulk operation:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la operación",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = (!priceFilter.min || producto.precio >= parseFloat(priceFilter.min)) &&
                        (!priceFilter.max || producto.precio <= parseFloat(priceFilter.max));
    
    return matchesSearch && matchesPrice;
  });

  const catalogProducts = productos.filter(producto => isProductInCatalog(producto.id));
  const selectedCount = filteredProducts.filter(p => isProductInCatalog(p.id)).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando gestión de catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Gestión de Catálogo</h1>
                <p className="text-muted-foreground">Cliente: {cliente?.nombre}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Vista Previa
              </Button>
              <Button
                onClick={() => navigate(`/client/${clientId}`)}
                className="btn-barplas flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver Portal Cliente
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos Totales</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                <CountUp end={productos.length} duration={1.5} />
              </div>
              <p className="text-xs text-muted-foreground">
                Productos disponibles
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Catálogo</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                <CountUp end={catalogProducts.length} duration={2} />
              </div>
              <p className="text-xs text-muted-foreground">
                Productos activos
              </p>
            </CardContent>
          </Card>

          <Card className="card-barplas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
              <Filter className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                <CountUp end={selectedCount} duration={1.5} />
              </div>
              <p className="text-xs text-muted-foreground">
                De {filteredProducts.length} filtrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="card-barplas mb-6">
          <CardHeader>
            <CardTitle>Filtros y Controles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Input
                type="number"
                placeholder="Precio mínimo"
                value={priceFilter.min}
                onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
              />
              
              <Input
                type="number"
                placeholder="Precio máximo"
                value={priceFilter.max}
                onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkToggle(true)}
                disabled={saving || selectedCount === filteredProducts.length}
                size="sm"
                variant="outline"
              >
                Seleccionar Todos ({filteredProducts.length})
              </Button>
              <Button
                onClick={() => handleBulkToggle(false)}
                disabled={saving || selectedCount === 0}
                size="sm"
                variant="outline"
              >
                Deseleccionar Todos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid/List */}
        <Card className="card-barplas">
          <CardHeader>
            <CardTitle>Productos ({filteredProducts.length})</CardTitle>
            <CardDescription>
              Activa/desactiva productos del catálogo de {cliente?.nombre}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron productos</p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }>
                {filteredProducts.map((producto) => (
                  <div key={producto.id} className={
                    viewMode === 'grid' 
                      ? "border rounded-lg p-4 hover:shadow-md transition-shadow"
                      : "flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  }>
                    <div className={viewMode === 'grid' ? "mb-3" : "flex-shrink-0"}>
                      <div className={`bg-muted rounded-lg flex items-center justify-center ${
                        viewMode === 'grid' ? 'aspect-square' : 'w-16 h-16'
                      }`}>
                        {producto.url_imagen ? (
                          <img 
                            src={producto.url_imagen} 
                            alt={producto.nombre}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className={viewMode === 'grid' ? "" : "flex-1"}>
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs mb-1">
                          {producto.sku}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{producto.nombre}</h3>
                      {producto.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {producto.descripcion}
                        </p>
                      )}
                      <p className="font-bold text-primary mb-3">
                        {formatCurrency(producto.precio)}
                      </p>
                    </div>
                    
                    <div className={viewMode === 'grid' ? "flex justify-between items-center" : "flex items-center gap-3"}>
                      <div className="text-sm">
                        {isProductInCatalog(producto.id) ? (
                          <Badge className="bg-success text-white">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                      <Switch
                        checked={isProductInCatalog(producto.id)}
                        onCheckedChange={() => toggleProduct(producto.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Catálogo</DialogTitle>
            <DialogDescription>
              Así verá {cliente?.nombre} su catálogo personalizado
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {catalogProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">El catálogo está vacío</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogProducts.map((producto) => (
                  <Card key={producto.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-3">
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2">
                        {producto.url_imagen ? (
                          <img 
                            src={producto.url_imagen} 
                            alt={producto.nombre}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {producto.sku}
                      </Badge>
                      <CardTitle className="text-sm">{producto.nombre}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">
                          {formatCurrency(producto.precio)}
                        </span>
                        <Button size="sm" className="btn-barplas">
                          Agregar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}