import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  User, 
  Package, 
  ShoppingBag, 
  Clock,
  MapPin,
  Phone,
  Mail,
  Eye,
  Filter,
  ArrowRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  type: 'client' | 'product' | 'order';
  title: string;
  subtitle: string;
  description: string;
  metadata: any;
  score: number;
}

interface SearchFilters {
  type: string;
  dateRange: string;
  status: string;
  minAmount: number;
  maxAmount: number;
}

export function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all',
    status: 'all',
    minAmount: 0,
    maxAmount: 10000
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState([
    "Clientes activos",
    "Pedidos pendientes", 
    "Productos más vendidos",
    "Envases aluminio",
    "Restaurante",
    "Último mes"
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('barplas-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, filters]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Search clients
      if (filters.type === 'all' || filters.type === 'clients') {
        const { data: clientsData } = await supabase
          .from('clientes')
          .select('*')
          .eq('comercial_id', user.id)
          .or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`)
          .limit(10);

        if (clientsData) {
          clientsData.forEach(client => {
            searchResults.push({
              id: client.id,
              type: 'client',
              title: client.nombre,
              subtitle: client.email || 'Sin email',
              description: `Tel: ${client.telefono || 'N/A'} | ${client.activo ? 'Activo' : 'Inactivo'}`,
              metadata: client,
              score: calculateRelevanceScore(searchTerm, client.nombre, 'client')
            });
          });
        }
      }

      // Search products
      if (filters.type === 'all' || filters.type === 'products') {
        const { data: productsData } = await supabase
          .from('productos')
          .select('*')
          .or(`nombre.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`)
          .eq('activo', true)
          .limit(10);

        if (productsData) {
          productsData.forEach(product => {
            searchResults.push({
              id: product.id,
              type: 'product',
              title: product.nombre,
              subtitle: `SKU: ${product.sku}`,
              description: `${formatCurrency(product.precio)} | ${product.descripcion || 'Sin descripción'}`,
              metadata: product,
              score: calculateRelevanceScore(searchTerm, product.nombre, 'product')
            });
          });
        }
      }

      // Search orders
      if (filters.type === 'all' || filters.type === 'orders') {
        const { data: ordersData } = await supabase
          .from('pedidos')
          .select(`
            *,
            clientes!inner (
              nombre,
              comercial_id
            )
          `)
          .eq('clientes.comercial_id', user.id)
          .or(`numero_pedido.ilike.%${searchTerm}%,notas.ilike.%${searchTerm}%`)
          .order('fecha_pedido', { ascending: false })
          .limit(10);

        if (ordersData) {
          ordersData.forEach(order => {
            searchResults.push({
              id: order.id,
              type: 'order',
              title: order.numero_pedido,
              subtitle: order.clientes?.nombre || 'Cliente desconocido',
              description: `${formatCurrency(order.total)} | ${order.estado} | ${new Date(order.fecha_pedido).toLocaleDateString('es-ES')}`,
              metadata: order,
              score: calculateRelevanceScore(searchTerm, order.numero_pedido, 'order')
            });
          });
        }
      }

      // Apply filters
      let filteredResults = searchResults;
      
      if (filters.minAmount > 0 || filters.maxAmount < 10000) {
        filteredResults = filteredResults.filter(result => {
          if (result.type === 'order') {
            const amount = parseFloat(result.metadata.total);
            return amount >= filters.minAmount && amount <= filters.maxAmount;
          }
          if (result.type === 'product') {
            const price = parseFloat(result.metadata.precio);
            return price >= filters.minAmount && price <= filters.maxAmount;
          }
          return true;
        });
      }

      if (filters.status !== 'all') {
        filteredResults = filteredResults.filter(result => {
          if (result.type === 'order') {
            return result.metadata.estado === filters.status;
          }
          if (result.type === 'client') {
            return filters.status === 'activo' ? result.metadata.activo : !result.metadata.activo;
          }
          return true;
        });
      }

      // Sort by relevance score
      filteredResults.sort((a, b) => b.score - a.score);

      setResults(filteredResults);

      // Save to recent searches
      if (searchTerm.trim()) {
        const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('barplas-recent-searches', JSON.stringify(updated));
      }

    } catch (error) {
      console.error('Error performing search:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const calculateRelevanceScore = (searchTerm: string, title: string, type: string): number => {
    const lowerSearch = searchTerm.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    let score = 0;
    
    // Exact match gets highest score
    if (lowerTitle === lowerSearch) score += 100;
    
    // Starts with search term
    if (lowerTitle.startsWith(lowerSearch)) score += 50;
    
    // Contains search term
    if (lowerTitle.includes(lowerSearch)) score += 25;
    
    // Type bonus (prioritize clients)
    if (type === 'client') score += 10;
    if (type === 'order') score += 5;
    
    return score;
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'client':
        navigate(`/client/${result.id}`);
        break;
      case 'order':
        // Open order details (could be a modal or dedicated page)
        toast.success(`Abriendo pedido ${result.title}`);
        break;
      case 'product':
        toast.success(`Producto: ${result.title}`);
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'client': return User;
      case 'product': return Package;
      case 'order': return ShoppingBag;
      default: return Search;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'product': return 'bg-green-100 text-green-800';
      case 'order': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const quickSearch = (term: string) => {
    setSearchTerm(term);
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
          <h2 className="text-2xl font-bold gradient-text">Búsqueda Global</h2>
          <p className="text-muted-foreground">Encuentra clientes, productos y pedidos rápidamente</p>
        </div>
      </div>

      {/* Search Input */}
      <Card className="card-barplas">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes, productos, pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-lg h-12"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-4 mt-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filters.type === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({...filters, type: 'all'})}
              >
                Todo
              </Button>
              <Button
                variant={filters.type === 'clients' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({...filters, type: 'clients'})}
              >
                Clientes
              </Button>
              <Button
                variant={filters.type === 'products' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({...filters, type: 'products'})}
              >
                Productos
              </Button>
              <Button
                variant={filters.type === 'orders' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({...filters, type: 'orders'})}
              >
                Pedidos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Results */}
        <div className="lg:col-span-2 space-y-4">
          {searchTerm.length < 2 ? (
            <Card className="card-barplas">
              <CardContent className="p-8 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Búsqueda Inteligente</h3>
                <p className="text-muted-foreground">
                  Escribe al menos 2 caracteres para comenzar la búsqueda
                </p>
              </CardContent>
            </Card>
          ) : results.length === 0 && !loading ? (
            <Card className="card-barplas">
              <CardContent className="p-8 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Sin Resultados</h3>
                <p className="text-muted-foreground">
                  No se encontraron resultados para "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => {
                const Icon = getResultIcon(result.type);
                return (
                  <motion.div
                    key={`${result.type}-${result.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="card-barplas cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => handleResultClick(result)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{result.title}</h3>
                              <Badge className={getTypeColor(result.type)}>
                                {result.type === 'client' ? 'Cliente' : 
                                 result.type === 'product' ? 'Producto' : 'Pedido'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {result.description}
                            </p>
                          </div>
                          
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar with suggestions and recent searches */}
        <div className="space-y-6">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Card className="card-barplas">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Búsquedas Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => quickSearch(search)}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {search}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Popular Searches */}
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Búsquedas Populares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {popularSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => quickSearch(search)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {search}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Search Tips */}
          <Card className="card-barplas">
            <CardHeader>
              <CardTitle>Tips de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Usa nombres completos o parciales</p>
              <p>• Busca por SKU de productos</p>
              <p>• Incluye números de pedido</p>
              <p>• Filtra por tipo para mejores resultados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}