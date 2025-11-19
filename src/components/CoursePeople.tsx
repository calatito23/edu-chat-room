import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, GraduationCap, Plus, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/**
 * Lista de personas en el curso
 * 
 * Muestra:
 * - Profesores del curso
 * - Lista de alumnos inscritos
 * - Gestión de usuarios (solo administradores)
 * 
 * Organización:
 * - Profesores en una sección separada
 * - Alumnos en grid responsivo
 */
interface CoursePeopleProps {
  courseId: string;
  teacherId: string;
}

const CoursePeople = ({ courseId, teacherId }: CoursePeopleProps) => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTeacherEmail, setSearchTeacherEmail] = useState("");
  const [searchStudentEmail, setSearchStudentEmail] = useState("");
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    checkUserRole();
    loadPeople();
    loadAllUsers();
  }, [courseId]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      setIsAdmin(roleData?.role === "administrator");
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  const loadPeople = async () => {
    try {
      // Load teachers assigned to the course
      const { data: courseTeachersData } = await supabase
        .from("course_teachers")
        .select("teacher_id")
        .eq("course_id", courseId);

      if (courseTeachersData && courseTeachersData.length > 0) {
        const teacherIds = courseTeachersData.map(ct => ct.teacher_id);
        const { data: teachersData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", teacherIds);
        
        setTeachers(teachersData || []);
      } else {
        setTeachers([]);
      }

      // Load students
      const { data: enrollmentsData } = await supabase
        .from("course_enrollments")
        .select("student_id")
        .eq("course_id", courseId);

      if (enrollmentsData && enrollmentsData.length > 0) {
        const studentIds = enrollmentsData.map(e => e.student_id);
        const { data: studentsData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", studentIds);
        
        setStudents(studentsData || []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error loading people:", error);
    }
  };

  const loadAllUsers = async () => {
    try {
      // Load all teachers from database
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (teacherRoles && teacherRoles.length > 0) {
        const teacherIds = teacherRoles.map(r => r.user_id);
        const { data: teachersData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", teacherIds);
        
        // Filter out teachers already assigned to this course
        const assignedTeacherIds = teachers.map(t => t.id);
        const availableTeachers = (teachersData || []).filter(
          t => !assignedTeacherIds.includes(t.id)
        );
        setAllTeachers(availableTeachers);
      } else {
        setAllTeachers([]);
      }

      // Load all students from database
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (studentRoles && studentRoles.length > 0) {
        const studentIds = studentRoles.map(r => r.user_id);
        const { data: studentsData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", studentIds);
        
        // Filter out students already enrolled in this course
        const enrolledStudentIds = students.map(s => s.id);
        const availableStudents = (studentsData || []).filter(
          s => !enrolledStudentIds.includes(s.id)
        );
        setAllStudents(availableStudents);
      } else {
        setAllStudents([]);
      }
    } catch (error) {
      console.error("Error loading all users:", error);
    }
  };

  const handleAddTeacher = async () => {
    if (!searchTeacherEmail.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un email",
        variant: "destructive",
      });
      return;
    }

    setIsAddingTeacher(true);
    try {
      // Buscar usuario por email
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", searchTeacherEmail.toLowerCase().trim())
        .single();

      if (!profileData) {
        throw new Error("Usuario no encontrado");
      }

      // Verificar que sea profesor
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profileData.id)
        .single();

      if (!roleData || roleData.role !== "teacher") {
        throw new Error("El usuario no tiene el rol de profesor");
      }

      // Verificar si ya está asignado
      const { data: existing } = await supabase
        .from("course_teachers")
        .select("id")
        .eq("course_id", courseId)
        .eq("teacher_id", profileData.id)
        .single();

      if (existing) {
        throw new Error("Este profesor ya está asignado al curso");
      }

      // Agregar profesor
      const { error } = await supabase
        .from("course_teachers")
        .insert({
          course_id: courseId,
          teacher_id: profileData.id,
          assigned_by: currentUserId!,
        });

      if (error) throw error;

      toast({
        title: "Profesor agregado",
        description: "El profesor ha sido asignado al curso exitosamente",
      });

      setSearchTeacherEmail("");
      setTeacherDialogOpen(false);
      loadPeople();
      loadAllUsers();
    } catch (error: any) {
      console.error("Error adding teacher:", error);
      toast({
        title: "Error al agregar profesor",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsAddingTeacher(false);
    }
  };

  const handleAddStudent = async () => {
    if (!searchStudentEmail.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un email",
        variant: "destructive",
      });
      return;
    }

    setIsAddingStudent(true);
    try {
      // Buscar usuario por email
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", searchStudentEmail.toLowerCase().trim())
        .single();

      if (!profileData) {
        throw new Error("Usuario no encontrado");
      }

      // Verificar que sea estudiante
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profileData.id)
        .single();

      if (!roleData || roleData.role !== "student") {
        throw new Error("El usuario no tiene el rol de estudiante");
      }

      // Verificar si ya está inscrito
      const { data: existing } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", profileData.id)
        .single();

      if (existing) {
        throw new Error("Este estudiante ya está inscrito en el curso");
      }

      // Inscribir estudiante
      const { error } = await supabase
        .from("course_enrollments")
        .insert({
          course_id: courseId,
          student_id: profileData.id,
        });

      if (error) throw error;

      toast({
        title: "Estudiante agregado",
        description: "El estudiante ha sido inscrito al curso exitosamente",
      });

      setSearchStudentEmail("");
      setStudentDialogOpen(false);
      loadPeople();
      loadAllUsers();
    } catch (error: any) {
      console.error("Error adding student:", error);
      toast({
        title: "Error al agregar estudiante",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    try {
      const { error } = await supabase
        .from("course_teachers")
        .delete()
        .eq("course_id", courseId)
        .eq("teacher_id", teacherId);

      if (error) throw error;

      toast({
        title: "Profesor removido",
        description: "El profesor ha sido removido del curso",
      });

      loadPeople();
      loadAllUsers();
    } catch (error: any) {
      console.error("Error removing teacher:", error);
      toast({
        title: "Error al remover profesor",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("course_enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("student_id", studentId);

      if (error) throw error;

      toast({
        title: "Estudiante removido",
        description: "El estudiante ha sido removido del curso",
      });

      loadPeople();
      loadAllUsers();
    } catch (error: any) {
      console.error("Error removing student:", error);
      toast({
        title: "Error al remover estudiante",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  const handleQuickAddTeacher = async (teacherId: string) => {
    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from("course_teachers")
        .select("id")
        .eq("course_id", courseId)
        .eq("teacher_id", teacherId)
        .single();

      if (existing) {
        toast({
          title: "Ya asignado",
          description: "Este profesor ya está asignado al curso",
          variant: "destructive",
        });
        return;
      }

      // Assign teacher to course
      const { error } = await supabase
        .from("course_teachers")
        .insert({
          course_id: courseId,
          teacher_id: teacherId,
          assigned_by: currentUserId!,
        });

      if (error) throw error;

      toast({
        title: "Profesor agregado",
        description: "El profesor ha sido asignado al curso exitosamente",
      });

      loadPeople();
      loadAllUsers();
    } catch (error: any) {
      console.error("Error adding teacher:", error);
      toast({
        title: "Error al agregar profesor",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  const handleQuickAddStudent = async (studentId: string) => {
    try {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .single();

      if (existing) {
        toast({
          title: "Ya inscrito",
          description: "Este estudiante ya está inscrito en el curso",
          variant: "destructive",
        });
        return;
      }

      // Enroll student
      const { error } = await supabase
        .from("course_enrollments")
        .insert({
          course_id: courseId,
          student_id: studentId,
        });

      if (error) throw error;

      toast({
        title: "Estudiante agregado",
        description: "El estudiante ha sido inscrito al curso exitosamente",
      });

      loadPeople();
      loadAllUsers();
    } catch (error: any) {
      console.error("Error adding student:", error);
      toast({
        title: "Error al agregar estudiante",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Teachers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Profesores ({teachers.length})
            </CardTitle>
            {isAdmin && (
              <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Profesor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Profesor</DialogTitle>
                    <DialogDescription>
                      Busca un profesor por su email para agregarlo al curso
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacher-email">Email del Profesor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="teacher-email"
                          type="email"
                          placeholder="profesor@ejemplo.com"
                          value={searchTeacherEmail}
                          onChange={(e) => setSearchTeacherEmail(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddTeacher()}
                        />
                        <Button onClick={handleAddTeacher} disabled={isAddingTeacher}>
                          {isAddingTeacher ? "Agregando..." : "Agregar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Assigned Teachers */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Profesores Asignados</h3>
              {teachers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No hay profesores asignados a este curso
                </p>
              ) : (
                <div className="space-y-2">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{teacher.full_name}</p>
                          <p className="text-sm text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeacher(teacher.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Available Teachers */}
            {isAdmin && allTeachers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Profesores Disponibles para Agregar</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{teacher.full_name}</p>
                          <p className="text-xs text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickAddTeacher(teacher.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-secondary" />
              Alumnos ({students.length})
            </CardTitle>
            {isAdmin && (
              <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Alumno
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Alumno</DialogTitle>
                    <DialogDescription>
                      Busca un alumno por su email para agregarlo al curso
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-email">Email del Alumno</Label>
                      <div className="flex gap-2">
                        <Input
                          id="student-email"
                          type="email"
                          placeholder="alumno@ejemplo.com"
                          value={searchStudentEmail}
                          onChange={(e) => setSearchStudentEmail(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddStudent()}
                        />
                        <Button onClick={handleAddStudent} disabled={isAddingStudent}>
                          {isAddingStudent ? "Agregando..." : "Agregar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Enrolled Students */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Alumnos Inscritos</h3>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Aún no hay alumnos inscritos en este curso
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Available Students */}
            {isAdmin && allStudents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Alumnos Disponibles para Agregar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {allStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickAddStudent(student.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursePeople;