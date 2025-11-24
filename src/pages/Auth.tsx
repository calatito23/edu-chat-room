import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import fieeLogo from "@/assets/fiee-logo.png";
import unmsmLogo from "@/assets/unmsm-logo.png";

/**
 * Página de autenticación del aula virtual
 * 
 * Funcionalidades:
 * - Login de usuarios existentes
 * - Registro de nuevos usuarios (alumnos y profesores)
 * - Recuperación de contraseña
 * - Redirección automática si el usuario ya está autenticado
 * 
 * El componente usa tabs para separar las diferentes funcionalidades
 * y gestiona el estado de carga durante las operaciones
 */
const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "teacher">("student");

  // Reset password state
  const [resetEmail, setResetEmail] = useState("");
  
  // Update password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Check if user is already logged in or coming from password reset
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if this is a password recovery redirect
      const isRecovery = searchParams.get("type") === "recovery";
      
      if (isRecovery) {
        // User is coming from password recovery email
        setShowUpdatePassword(true);
      } else if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Verifica tus credenciales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName,
            role: signupRole,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al crear cuenta",
        description: error.message || "Intenta con otro email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: "Revisa tu correo para restablecer tu contraseña",
      });

      setResetEmail("");
      setShowResetPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña ha sido cambiada exitosamente",
      });

      setNewPassword("");
      setConfirmPassword("");
      setShowUpdatePassword(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 relative overflow-hidden">
      {/* Logo UNMSM como marca de agua */}
      <div className="absolute top-6 right-6 opacity-40">
        <img 
          src={unmsmLogo} 
          alt="UNMSM" 
          className="h-16 w-auto object-contain"
        />
      </div>

      <Card className="w-full max-w-md shadow-[var(--shadow-elevated)] relative z-10">
        <CardHeader className="text-center space-y-2 pb-4">
          {/* Logo FIEE destacado */}
          <div className="flex justify-center mb-1">
            <img 
              src={fieeLogo} 
              alt="FIEE Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Aula Virtual FIEE
          </CardTitle>
          <CardDescription className="text-xs">
            Facultad de Ingeniería Electrónica y Eléctrica
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showUpdatePassword ? (
            <div className="space-y-3">
              <div className="mb-2">
                <h3 className="text-base font-semibold">Nueva Contraseña</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ingresa tu nueva contraseña
                </p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-sm">Nueva Contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm">Confirmar Contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-9"
                  />
                </div>
                <Button type="submit" className="w-full h-9" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cambiar Contraseña
                </Button>
              </form>
            </div>
          ) : !showResetPassword ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Ingresar</TabsTrigger>
                <TabsTrigger value="signup">Registro</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <Button type="submit" className="w-full h-9" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-sm">Nombre Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-role" className="text-sm">Tipo de Usuario</Label>
                    <Select value={signupRole} onValueChange={(value: "student" | "teacher") => setSignupRole(value)}>
                      <SelectTrigger id="signup-role" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Alumno</SelectItem>
                        <SelectItem value="teacher">Profesor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full h-9" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">Recuperar Contraseña</h3>
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Volver
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-sm">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <Button type="submit" className="w-full h-9" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Email de Recuperación
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;