import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, LogOut, MessageSquare, BookOpen, Plus, Users, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Notifications } from "@/components/Notifications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Dashboard principal del aula virtual
 * 
 * Este componente es el centro de control de la aplicación:
 * - Verifica autenticación del usuario
 * - Detecta el rol del usuario (alumno o profesor)
 * - Muestra cursos según el rol:
 *   * Alumnos: ven sus cursos inscritos
 *   * Profesores: ven los cursos que imparten
 * - Proporciona navegación a chat y gestión de cursos
 * 
 * Estructura de datos:
 * - courses: lista de cursos con información del profesor
 * - enrollmentCount: número de alumnos por curso (solo para profesores)
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"student" | "teacher" | "administrator" | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    setupAuthListener();
  }, []);

  const setupAuthListener = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
        await loadCourses(session.user.id, roleData.role);
      }
    } catch (error: any) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async (userId: string, role: "student" | "teacher" | "administrator") => {
    try {
      if (role === "teacher" || role === "administrator") {
        // Load courses created by administrator
        const { data: createdCourses, error: createdError } = await supabase
          .from("courses")
          .select("*")
          .eq("created_by", userId)
          .order("created_at", { ascending: false });

        if (createdError) throw createdError;

        // Load courses where user is assigned as teacher
        const { data: teacherAssignments, error: assignmentError } = await supabase
          .from("course_teachers")
          .select("course_id")
          .eq("teacher_id", userId);

        if (assignmentError) throw assignmentError;

        let assignedCourses: any[] = [];
        if (teacherAssignments && teacherAssignments.length > 0) {
          const courseIds = teacherAssignments.map(ta => ta.course_id);
          const { data: assignedCoursesData } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)
            .order("created_at", { ascending: false });
          
          assignedCourses = assignedCoursesData || [];
        }

        // Combine and deduplicate courses
        const allCourses = [...(createdCourses || []), ...assignedCourses];
        const uniqueCourses = Array.from(
          new Map(allCourses.map(course => [course.id, course])).values()
        );

        // Get enrollment counts and teacher profiles
        const coursesWithDetails = await Promise.all(
          uniqueCourses.map(async (course) => {
            const { count } = await supabase
              .from("course_enrollments")
              .select("id", { count: "exact", head: true })
              .eq("course_id", course.id);

            // Get teacher profile if teacher_id exists
            let teacherProfile = null;
            if (course.teacher_id) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", course.teacher_id)
                .single();
              teacherProfile = profileData;
            }

            return { 
              ...course,
              enrollmentCount: count || 0,
              profiles: teacherProfile
            };
          })
        );

        setCourses(coursesWithDetails);
      } else {
        // Load courses enrolled by student
        const { data: enrollmentsData, error } = await supabase
          .from("course_enrollments")
          .select("*, courses(*)")
          .eq("student_id", userId)
          .order("enrolled_at", { ascending: false });

        if (error) throw error;

        // Get teacher profiles for each course
        const coursesWithProfiles = await Promise.all(
          (enrollmentsData || []).map(async (enrollment: any) => {
            const { data: teacherProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", enrollment.courses.teacher_id)
              .single();

            return {
              ...enrollment.courses,
              profiles: teacherProfile
            };
          })
        );

        setCourses(coursesWithProfiles);
      }
    } catch (error: any) {
      console.error("Error loading courses:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los cursos",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;

      toast({
        title: "Curso eliminado",
        description: "El curso ha sido eliminado exitosamente",
      });

      // Reload courses
      if (user && userRole) {
        await loadCourses(user.id, userRole);
      }
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el curso",
        variant: "destructive",
      });
    } finally {
      setCourseToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-[var(--shadow-soft)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Aula Virtual</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.full_name} - {userRole === "teacher" ? "Profesor" : "Alumno"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/chat")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Notifications />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {(userRole === "teacher" || userRole === "administrator") ? "Mis Cursos" : "Cursos Inscritos"}
          </h2>
          {userRole === "administrator" && (
            <Button onClick={() => navigate("/courses/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Curso
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {userRole === "administrator"
                    ? "Aún no has creado ningún curso. ¡Comienza creando tu primer curso!"
                    : userRole === "teacher" 
                    ? "No tienes ningún curso asignado. Contacta a un administrador."
                    : "Aún no estás inscrito en ningún curso. Pide a un administrador que te agregue a un curso."}
                </p>
                {userRole === "administrator" && (
                  <Button className="mt-4" onClick={() => navigate("/courses/create")}>
                    Crear Primer Curso
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            courses.map((course) => (
              <Card
                key={course.id}
                className="hover:shadow-[var(--shadow-elevated)] transition-all relative"
              >
                <div onClick={() => navigate(`/courses/${course.id}`)} className="cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {course.description || "Sin descripción"}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Impartido por: {course.profiles?.full_name || "Sin asignar"}
                      </span>
                      {(userRole === "teacher" || userRole === "administrator") && (
                        <span className="flex items-center gap-1 text-primary">
                          <Users className="h-4 w-4" />
                          {course.enrollmentCount}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>
                {userRole === "administrator" && (
                  <div className="absolute top-4 right-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourseToDelete(course.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El curso y todos sus datos asociados serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => courseToDelete && handleDeleteCourse(courseToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;