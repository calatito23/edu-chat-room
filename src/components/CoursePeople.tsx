import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, GraduationCap } from "lucide-react";

/**
 * Lista de personas en el curso
 * 
 * Muestra:
 * - Profesor del curso (siempre al inicio)
 * - Lista de alumnos inscritos
 * - Avatar y nombre de cada usuario
 * 
 * Organización:
 * - Profesor en una sección separada
 * - Alumnos en grid responsivo
 */
interface CoursePeopleProps {
  courseId: string;
  teacherId: string;
}

const CoursePeople = ({ courseId, teacherId }: CoursePeopleProps) => {
  const [teacher, setTeacher] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    loadPeople();
  }, [courseId]);

  const loadPeople = async () => {
    try {
      // Load teacher
      const { data: teacherData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", teacherId)
        .single();

      setTeacher(teacherData);

      // Load students
      const { data: enrollmentsData } = await supabase
        .from("course_enrollments")
        .select("*, profiles:student_id(*)")
        .eq("course_id", courseId);

      setStudents(enrollmentsData?.map((e) => e.profiles) || []);
    } catch (error) {
      console.error("Error loading people:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Profesor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teacher && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{teacher.full_name}</p>
                <p className="text-sm text-muted-foreground">Profesor del curso</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-secondary" />
            Alumnos ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aún no hay alumnos inscritos en este curso
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">Alumno</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursePeople;