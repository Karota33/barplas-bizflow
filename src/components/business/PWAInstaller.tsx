import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Settings,
  Bell,
  X,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface PWAInstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NotificationSettings {
  orders: boolean;
  clients: boolean;
  system: boolean;
}

export function PWAInstaller() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<PWAInstallEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orders: true,
    clients: true,
    system: false
  });
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'updating' | 'updated'>('idle');

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as PWAInstallEvent);
      setShowInstallBanner(true);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      toast.success('¡BARPLAS instalado correctamente!');
    };

    // Check notification permission
    setNotificationPermission(Notification.permission);

    // Service Worker registration and updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            setCacheStatus('updating');
            const newWorker = registration.installing;
            
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setCacheStatus('updated');
                toast.success('Nueva versión disponible - Actualiza la página');
              }
            });
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        setShowInstallBanner(false);
        toast.success('Instalando BARPLAS...');
      } else {
        toast.info('Instalación cancelada');
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
      toast.error('Error al instalar la aplicación');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          toast.success('Notificaciones activadas');
          // Send test notification
          new Notification('BARPLAS', {
            body: 'Notificaciones configuradas correctamente',
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
        } else {
          toast.error('Permiso de notificaciones denegado');
        }
      } catch (error) {
        console.error('Notification permission error:', error);
        toast.error('Error al solicitar permisos de notificación');
      }
    }
  };

  const updateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.update();
          setCacheStatus('updating');
          toast.info('Actualizando aplicación...');
          
          // Reload page after update
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });
    }
  };

  const clearCache = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        toast.success('Cache limpiado correctamente');
        
        // Reload to get fresh content
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('Error clearing cache:', error);
        toast.error('Error al limpiar el cache');
      }
    }
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
          <h2 className="text-2xl font-bold gradient-text">Configuración PWA</h2>
          <p className="text-muted-foreground">Instalar y configurar la aplicación web</p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-2 text-success">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && !isInstalled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Instalar BARPLAS</h3>
                      <p className="text-sm text-muted-foreground">
                        Accede más rápido y trabaja sin conexión
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button onClick={handleInstall} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Instalar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowInstallBanner(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installation Status */}
        <Card className="card-barplas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Estado de Instalación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {isInstalled ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <Download className="w-6 h-6 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isInstalled ? 'Aplicación Instalada' : 'No Instalado'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isInstalled 
                      ? 'BARPLAS está instalado como PWA'
                      : 'Instala para acceso rápido'
                    }
                  </p>
                </div>
              </div>
              {isInstalled ? (
                <Badge className="bg-success/10 text-success">
                  Instalado
                </Badge>
              ) : (
                <Button onClick={handleInstall} disabled={!installPrompt}>
                  Instalar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Beneficios de la instalación:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Acceso directo desde el escritorio
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Funciona sin conexión a internet
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Actualizaciones automáticas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Notificaciones push
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="card-barplas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Permisos de Notificación</p>
                <p className="text-sm text-muted-foreground">
                  {notificationPermission === 'granted' 
                    ? 'Activado' 
                    : notificationPermission === 'denied'
                    ? 'Denegado'
                    : 'No configurado'
                  }
                </p>
              </div>
              {notificationPermission !== 'granted' && (
                <Button 
                  onClick={requestNotificationPermission}
                  size="sm"
                >
                  Activar
                </Button>
              )}
            </div>

            {notificationPermission === 'granted' && (
              <div className="space-y-3">
                <h4 className="font-medium">Tipos de Notificaciones:</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="orders">Nuevos Pedidos</Label>
                    <Switch
                      id="orders"
                      checked={notificationSettings.orders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({...prev, orders: checked}))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clients">Actualizaciones de Clientes</Label>
                    <Switch
                      id="clients"
                      checked={notificationSettings.clients}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({...prev, clients: checked}))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system">Notificaciones del Sistema</Label>
                    <Switch
                      id="system"
                      checked={notificationSettings.system}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({...prev, system: checked}))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Management */}
        <Card className="card-barplas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Gestión de App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Actualizar Aplicación</p>
                  <p className="text-sm text-muted-foreground">
                    {cacheStatus === 'updating' ? 'Actualizando...' :
                     cacheStatus === 'updated' ? 'Actualización disponible' :
                     'Aplicación actualizada'
                    }
                  </p>
                </div>
                <Button 
                  onClick={updateApp}
                  size="sm"
                  variant={cacheStatus === 'updated' ? 'default' : 'outline'}
                  disabled={cacheStatus === 'updating'}
                >
                  {cacheStatus === 'updating' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Limpiar Cache</p>
                  <p className="text-sm text-muted-foreground">
                    Elimina archivos temporales
                  </p>
                </div>
                <Button onClick={clearCache} size="sm" variant="outline">
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Información de la App:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Versión</p>
                  <p className="font-mono">1.0.0</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última actualización</p>
                  <p className="font-mono">{new Date().toLocaleDateString('es-ES')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plataforma</p>
                  <p className="font-mono">{navigator.platform}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Navegador</p>
                  <p className="font-mono">
                    {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                     navigator.userAgent.includes('Firefox') ? 'Firefox' :
                     navigator.userAgent.includes('Safari') ? 'Safari' : 'Otro'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offline Features */}
        <Card className="card-barplas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              Funcionalidad Offline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              isOnline ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
            }`}>
              <p className="font-medium">
                {isOnline ? 'Conectado' : 'Sin Conexión'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? 'Todas las funciones disponibles'
                  : 'Modo offline activado - datos en cache disponibles'
                }
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Disponible sin conexión:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Dashboard principal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Lista de clientes (cache)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Catálogo de productos (cache)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Calculadora de presupuestos
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}