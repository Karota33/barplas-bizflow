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
  PackagePlus, 
  Edit3, 
  Package,
  Euro,
  Hash,
  Search
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  stock_disponible: number;
  url_imagen?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIAS = [
  'Embalaje',
  'Alimentario', 
  'Industrial',
  'Farmacéutico',
  'Cosmético',
  'Promocional',
  'Otros'
];

export function ProductManager() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    categoria: '',
    stock_disponible: 0,
    url_imagen: '',
    activo: true
  });

  useEffect(() => {
    if (isAdmin) {
      loadProducts();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter]);

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('productos')
        .select('*')
        .order('nombre');

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Error al cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.categoria === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PRD-${timestamp}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        ...formData,
        sku: formData.sku || generateSKU(),
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('productos')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente"
        });
      } else {
        const { error } = await supabase
          .from('productos')
          .insert(productData);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Producto creado correctamente"
        });
      }

      setDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: product.precio,
      categoria: product.categoria || '',
      stock_disponible: product.stock_disponible,
      url_imagen: product.url_imagen || '',
      activo: product.activo
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente"
      });
      
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: '',
      stock_disponible: 0,
      url_imagen: '',
      activo: true
    });
  };

  const openNewProductDialog = () => {
    setEditingProduct(null);
    resetForm();
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Gestión de Productos</h1>
            <p className="text-muted-foreground mt-1">Administra el catálogo completo de BARPLAS</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-barplas" onClick={openNewProductDialog}>
                <PackagePlus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      placeholder={!editingProduct ? "Auto-generado si se deja vacío" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => setFormData({...formData, categoria: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((categoria) => (
                          <SelectItem key={categoria} value={categoria}>
                            {categoria}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del producto</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precio">Precio (€)</Label>
                    <Input
                      id="precio"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock disponible</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock_disponible}
                      onChange={(e) => setFormData({...formData, stock_disponible: parseInt(e.target.value) || 0})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Imagen del producto</Label>
                  <ImageUpload
                    bucket="products"
                    path="catalog"
                    onUpload={(url) => setFormData({...formData, url_imagen: url})}
                    currentImage={formData.url_imagen}
                    maxWidth={400}
                    maxHeight={400}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                  />
                  <Label htmlFor="activo">Producto activo</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-barplas" disabled={loading}>
                    {editingProduct ? 'Actualizar' : 'Crear'}
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
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {CATEGORIAS.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de productos */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="card-barplas overflow-hidden">
                <div className="aspect-square bg-muted/30 relative">
                  {product.url_imagen ? (
                    <img 
                      src={product.url_imagen} 
                      alt={product.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={product.activo ? 'Activo' : 'Inactivo'} />
                  </div>
                  <div className="absolute top-2 right-2">
                    {product.categoria && (
                      <Badge variant="outline" className="bg-white/90">
                        {product.categoria}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2">{product.nombre}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Hash className="w-4 h-4 mr-1" />
                    {product.sku}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {product.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.descripcion}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center font-bold text-lg">
                      <Euro className="w-4 h-4 mr-1" />
                      {product.precio.toFixed(2)}
                    </div>
                    <Badge variant={product.stock_disponible > 0 ? 'default' : 'destructive'}>
                      Stock: {product.stock_disponible}
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    
                    <ConfirmDialog
                      title="Eliminar Producto"
                      description={`¿Estás seguro de que deseas eliminar "${product.nombre}"? Esta acción no se puede deshacer.`}
                      onConfirm={() => handleDelete(product.id)}
                      destructive
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || categoryFilter ? 'No se encontraron productos' : 'No hay productos registrados'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza agregando el primer producto al catálogo.'
                }
              </p>
              {!searchTerm && !categoryFilter && (
                <Button className="btn-barplas" onClick={openNewProductDialog}>
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Crear Primer Producto
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}