import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, FileText, Upload } from "lucide-react";
import CourseStream from "@/components/CourseStream";
import CoursePeople from "@/components/CoursePeople";
import CourseFiles from "@/components/CourseFiles";

/**
 * Vista detallada de un curso
 * 
 * Esta página muestra toda la información y funcionalidades de un curso:
 * - Información general (título, descripción, código)
 * - Stream: publicaciones del profesor y comentarios
 * - Personas: lista de alumnos inscritos y profesor
 * - Archivos: sistema de subida y descarga de archivos
 * 
 * Permisos:
 * - Alumnos: solo pueden ver cursos en los que están inscritos
 * - Profesores: solo pueden ver sus propios cursos
 * - Alumnos pueden inscribirse usando el código del curso
 */
const CourseView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [userRole, setUserRole] = useState<"student" | "teacher" | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollCode, setEnrollCode] = useState("");

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      }

      // Get course data
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*, profiles!courses_teacher_id_fkey(full_name, avatar_url)")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      setCourse(courseData);

      // Check if user is enrolled (for students)
      if (roleData?.role === "student") {
        const { data: enrollmentData } = await supabase
          .from("course_enrollments")
          .select("*")
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .single();

        setIsEnrolled(!!enrollmentData);
      } else if (roleData?.role === "teacher") {
        setIsEnrolled(courseData.teacher_id === user.id);
      }
    } catch (error: any) {
      console.error("Error loading course:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el curso",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verify code matches
      if (enrollCode.toUpperCase() !== course.code) {
        toast({
          title: "Código incorrecto",
          description: "El código ingresado no coincide con este curso",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("course_enrollments")
        .insert({
          course_id: courseId,
          student_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "¡Inscrito!",
        description: "Te has inscrito exitosamente al curso",
      });

      setIsEnrolled(true);
      setEnrollCode("");
    } catch (error: any) {
      toast({
        title: "Error al inscribirse",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isEnrolled && userRole === "student") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-md py-8">
          <Button variant="ghost" className="mb-6" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>{course?.title}</CardTitle>
              <CardDescription>Necesitas inscribirte para acceder a este curso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Código del Curso</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Ingresa el código"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
                />
              </div>
              <Button onClick={handleEnroll} className="w-full">
                Inscribirse al Curso
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" className="mb-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{course?.title}</h1>
            <p className="text-muted-foreground">{course?.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Código: {course?.code}</span>
              <span>Profesor: {course?.profiles?.full_name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="stream" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="stream">
              <FileText className="h-4 w-4 mr-2" />
              Stream
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="h-4 w-4 mr-2" />
              Personas
            </TabsTrigger>
            <TabsTrigger value="files">
              <Upload className="h-4 w-4 mr-2" />
              Archivos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stream" className="mt-6">
            <CourseStream courseId={courseId!} userRole={userRole!} />
          </TabsContent>

          <TabsContent value="people" className="mt-6">
            <CoursePeople courseId={courseId!} teacherId={course?.teacher_id} />
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <CourseFiles courseId={courseId!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CourseView;