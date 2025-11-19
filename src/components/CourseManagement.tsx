import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CourseManagementProps {
  courseId: string;
}

export default function CourseManagement({ courseId }: CourseManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"teacher" | "student">("student");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [detectingRole, setDetectingRole] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [courseId]);

  const loadMembers = async () => {
    try {
      // Load teachers
      const { data: teacherAssignments } = await supabase
        .from("course_teachers")
        .select("teacher_id")
        .eq("course_id", courseId);

      if (teacherAssignments && teacherAssignments.length > 0) {
        const teacherIds = teacherAssignments.map((t) => t.teacher_id);
        const { data: teacherProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", teacherIds);

        setTeachers(teacherProfiles || []);
      } else {
        setTeachers([]);
      }

      // Load students
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("student_id")
        .eq("course_id", courseId);

      if (enrollments && enrollments.length > 0) {
        const studentIds = enrollments.map((e) => e.student_id);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds);

        setStudents(studentProfiles || []);
      } else {
        setStudents([]);
      }
    } catch (error: any) {
      console.error("Error loading members:", error);
    }
  };

  const detectUserRole = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes("@")) return;
    
    setDetectingRole(true);
    try {
      const { data: foundProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", emailValue.trim().toLowerCase())
        .single();
      
      if (foundProfile) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", foundProfile.id)
          .single();

        if (roleData && (roleData.role === "teacher" || roleData.role === "student")) {
          setUserType(roleData.role);
        }
      }
    } catch (error) {
      // Silently fail if user not found
    } finally {
      setDetectingRole(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Search for user by email in profiles table
      const { data: foundProfile, error: searchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .single();
      
      if (searchError || !foundProfile) {
        throw new Error("Usuario no encontrado con ese correo");
      }

      // Verify user has the correct role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", foundProfile.id)
        .single();

      if (!roleData || roleData.role !== userType) {
        throw new Error(`El usuario no tiene el rol de ${userType === "teacher" ? "docente" : "estudiante"}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      if (userType === "teacher") {
        // Add teacher to course
        const { error } = await supabase
          .from("course_teachers")
          .insert({
            course_id: courseId,
            teacher_id: foundProfile.id,
            assigned_by: user.id,
          });

        if (error) {
          if (error.code === "23505") {
            throw new Error("El docente ya está asignado a este curso");
          }
          throw error;
        }
      } else {
        // Add student to course
        const { error } = await supabase
          .from("course_enrollments")
          .insert({
            course_id: courseId,
            student_id: foundProfile.id,
          });

        if (error) {
          if (error.code === "23505") {
            throw new Error("El estudiante ya está inscrito en este curso");
          }
          throw error;
        }
      }

      toast({
        title: "¡Miembro agregado!",
        description: `${userType === "teacher" ? "Docente" : "Estudiante"} agregado exitosamente al curso`,
      });

      setEmail("");
      loadMembers();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Error al agregar miembro",
        description: error.message || "Verifica el correo e intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, type: "teacher" | "student") => {
    try {
      if (type === "teacher") {
        const { error } = await supabase
          .from("course_teachers")
          .delete()
          .eq("course_id", courseId)
          .eq("teacher_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_enrollments")
          .delete()
          .eq("course_id", courseId)
          .eq("student_id", userId);

        if (error) throw error;
      }

      toast({
        title: "Miembro eliminado",
        description: `${type === "teacher" ? "Docente" : "Estudiante"} eliminado del curso`,
      });

      loadMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error al eliminar miembro",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar Miembro al Curso</CardTitle>
          <CardDescription>
            Agrega docentes o estudiantes al curso usando su correo electrónico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@unmsm.edu.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => detectUserRole(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userType">Tipo de Usuario</Label>
                <Select 
                  value={userType} 
                  onValueChange={(value: any) => setUserType(value)}
                  disabled={detectingRole}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Estudiante</SelectItem>
                    <SelectItem value="teacher">Docente</SelectItem>
                  </SelectContent>
                </Select>
                {detectingRole && (
                  <p className="text-xs text-muted-foreground">Detectando rol...</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Agregar {userType === "teacher" ? "Docente" : "Estudiante"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Docentes ({teachers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{teacher.full_name}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {teacher.email}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(teacher.id, "teacher")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay docentes asignados
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estudiantes ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.length > 0 ? (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{student.full_name}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {student.email}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(student.id, "student")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay estudiantes inscritos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
