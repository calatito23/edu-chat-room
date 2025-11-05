import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, MessageSquare, Upload } from "lucide-react";
import fieeLogo from "@/assets/fiee-logo.png";

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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="flex justify-center mb-8">
            <img 
              src={fieeLogo} 
              alt="FIEE Logo" 
              className="h-32 w-32 object-contain"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Aula Virtual FIEE
          </h1>
          <p className="text-lg font-medium text-primary/80 max-w-2xl mx-auto">
            Facultad de Ingeniería Electrónica y Eléctrica
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Universidad Nacional Mayor de San Marcos
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mt-4">
            Plataforma educativa para la gestión de cursos, comunicación entre estudiantes y docentes
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <Button size="lg" onClick={() => navigate("/auth?tab=signup")}>
              Comenzar Ahora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?tab=login")}>
              Iniciar Sesión
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-xl bg-card shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition-all">
            <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Gestión de Cursos</h3>
            <p className="text-muted-foreground">
              Crea y gestiona cursos, inscribe alumnos y organiza contenido educativo
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition-all">
            <div className="inline-flex p-4 rounded-full bg-secondary/10 mb-4">
              <MessageSquare className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Chat en Tiempo Real</h3>
            <p className="text-muted-foreground">
              Comunícate con alumnos y profesores mediante chat privado en tiempo real
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition-all">
            <div className="inline-flex p-4 rounded-full bg-accent/10 mb-4">
              <Upload className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2">Archivos Compartidos</h3>
            <p className="text-muted-foreground">
              Sube y descarga documentos, imágenes y recursos del curso
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20 p-8 rounded-2xl bg-gradient-to-r from-primary/5 to-secondary/5 border">
          <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Únete a la plataforma educativa que facilita el aprendizaje y la enseñanza
          </p>
          <Button size="lg" onClick={() => navigate("/auth?tab=signup")}>
            Crear Cuenta Gratis
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
