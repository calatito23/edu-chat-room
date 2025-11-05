import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageSquare, Upload } from "lucide-react";
import fieeLogo from "@/assets/fiee-logo.png";
import unmsmLogo from "@/assets/unmsm-logo.png";

/**
 * Página de inicio del Aula Virtual
 * 
 * Landing page que presenta la plataforma y redirige a:
 * - Auth: para usuarios no autenticados
 * - Dashboard: para usuarios ya autenticados
 * 
 * Características destacadas:
 * - Gestión de cursos
 * - Chat entre usuarios
 * - Sistema de archivos
 * - Publicaciones y comentarios
 */
const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center relative overflow-hidden">
      {/* Logo UNMSM como marca de agua */}
      <div className="absolute top-6 right-6 opacity-40">
        <img 
          src={unmsmLogo} 
          alt="UNMSM" 
          className="h-20 w-auto object-contain"
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4 animate-fade-in">
          <div className="flex justify-center mb-4">
            <img 
              src={fieeLogo} 
              alt="FIEE Logo" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Aula Virtual FIEE
          </h1>
          <p className="text-lg font-medium text-primary/80">
            Facultad de Ingeniería Electrónica y Eléctrica
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Plataforma educativa para la gestión de cursos y comunicación
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Button size="lg" onClick={() => navigate("/auth?tab=signup")}>
              Comenzar Ahora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?tab=login")}>
              Iniciar Sesión
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-5 rounded-xl bg-card shadow-[var(--shadow-soft)] hover:shadow-[0_8px_24px_hsl(356_72%_52%_/_0.2)] transition-all hover-scale">
            <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Gestión de Cursos</h3>
            <p className="text-sm text-muted-foreground">
              Crea y gestiona cursos, inscribe alumnos y organiza contenido
            </p>
          </div>

          <div className="text-center p-5 rounded-xl bg-card shadow-[var(--shadow-soft)] hover:shadow-[0_8px_24px_hsl(356_72%_52%_/_0.2)] transition-all hover-scale">
            <div className="inline-flex p-3 rounded-full bg-secondary/10 mb-3">
              <MessageSquare className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Chat en Tiempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Comunícate con alumnos y profesores en tiempo real
            </p>
          </div>

          <div className="text-center p-5 rounded-xl bg-card shadow-[var(--shadow-soft)] hover:shadow-[0_8px_24px_hsl(356_72%_52%_/_0.2)] transition-all hover-scale">
            <div className="inline-flex p-3 rounded-full bg-accent/10 mb-3">
              <Upload className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold mb-2">Archivos Compartidos</h3>
            <p className="text-sm text-muted-foreground">
              Sube y descarga documentos y recursos del curso
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
