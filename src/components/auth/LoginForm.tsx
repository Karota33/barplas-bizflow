import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Verify user exists in comerciales table
      if (data.user) {
        const { data: comercial, error: dbError } = await supabase
          .from('comerciales')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (dbError || !comercial) {
          setError("Usuario no encontrado en el sistema. Contacte al administrador.");
          await supabase.auth.signOut();
          return;
        }

        if (!comercial.activo) {
          setError("Usuario inactivo. Contacte al administrador.");
          await supabase.auth.signOut();
          return;
        }

        toast({
          title: "Bienvenido",
          description: `Hola ${comercial.nombre}! Acceso exitoso al portal BARPLAS.`,
        });

        navigate("/dashboard");
      }
    } catch (err) {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo y Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">BARPLAS Portal</h1>
          <p className="text-muted-foreground mt-2">Sistema Comercial B2B</p>
        </div>

        <Card className="card-barplas">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">
              Accede a tu panel de comercial
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="comercial@barplas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full btn-barplas" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Credentials */}
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-semibold mb-2">Credenciales de Demo:</p>
              <p>Email: <code className="bg-muted px-1 rounded">javvv.6@gmail.com</code></p>
              <p>Password: <code className="bg-muted px-1 rounded">karota33</code></p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>BARPLAS Canarias © 2024</p>
          <p>Portal B2B para comerciales</p>
        </div>
      </div>
    </div>
  );
}