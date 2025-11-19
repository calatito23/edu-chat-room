import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

/**
 * Página para crear un nuevo curso (solo profesores)
 * 
 * Funcionalidades:
 * - Formulario para crear curso con título, descripción y código
 * - Genera un código único para el curso
 * - Valida que el usuario sea profesor
 * - Redirige al curso una vez creado
 * 
 * Validaciones:
 * - Código único (no puede existir otro curso con el mismo código)
 * - Solo profesores pueden acceder
 * - Campos requeridos: título y código
 */
const CreateCourse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar que el usuario sea administrador
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "administrator") {
        throw new Error("Solo los administradores pueden crear cursos");
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          title,
          description,
          code: code.toUpperCase(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "¡Curso creado!",
        description: "El curso ha sido creado exitosamente",
      });

      navigate(`/courses/${data.id}`);
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast({
        title: "Error al crear curso",
        description: error.message?.includes("duplicate") 
          ? "Este código ya existe. Genera uno nuevo."
          : error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>

        <Card className="shadow-[var(--shadow-elevated)]">
          <CardHeader>
            <CardTitle>Crear Nuevo Curso</CardTitle>
            <CardDescription>
              Completa la información para crear un nuevo curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título del Curso *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Matemáticas Avanzadas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el contenido y objetivos del curso..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="code">Código del Curso *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateCode}
                  >
                    Generar Código
                  </Button>
                </div>
                <Input
                  id="code"
                  placeholder="Ej: MAT2024"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  maxLength={10}
                />
                <p className="text-sm text-muted-foreground">
                  Los alumnos usarán este código para inscribirse al curso
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Curso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCourse;