import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";

/**
 * Página para que los alumnos se unan a un curso usando un código
 * 
 * Funcionalidades:
 * - Buscar curso por código
 * - Inscribirse al curso encontrado
 * - Validar que el código sea correcto
 * - Redirigir al curso una vez inscrito
 * 
 * Validaciones:
 * - Solo alumnos pueden usar esta página
 * - El código debe existir
 * - No se puede inscribir dos veces al mismo curso
 */
const JoinCourse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Buscar curso por código
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("code", code.toUpperCase())
        .single();

      if (courseError || !course) {
        throw new Error("Código de curso no válido");
      }

      // Verificar si ya está inscrito
      const { data: existingEnrollment } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("course_id", course.id)
        .eq("student_id", user.id)
        .single();

      if (existingEnrollment) {
        toast({
          title: "Ya estás inscrito",
          description: "Ya estás inscrito en este curso",
          variant: "destructive",
        });
        navigate(`/courses/${course.id}`);
        return;
      }

      // Inscribirse al curso
      const { error: enrollError } = await supabase
        .from("course_enrollments")
        .insert({
          course_id: course.id,
          student_id: user.id,
        });

      if (enrollError) throw enrollError;

      toast({
        title: "¡Inscrito exitosamente!",
        description: `Te has unido al curso: ${course.title}`,
      });

      navigate(`/courses/${course.id}`);
    } catch (error: any) {
      console.error("Error joining course:", error);
      toast({
        title: "Error al unirse al curso",
        description: error.message || "Verifica el código e intenta nuevamente",
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
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary to-secondary">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle>Unirse a un Curso</CardTitle>
            <CardDescription>
              Ingresa el código del curso que te proporcionó tu profesor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinCourse} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Código del Curso</Label>
                <Input
                  id="code"
                  placeholder="Ej: ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  maxLength={10}
                  className="text-center text-2xl font-bold tracking-wider"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Solicita el código a tu profesor
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
                  Unirse al Curso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinCourse;
