import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface CourseGradesProps {
  courseId: string;
}

interface Student {
  id: string;
  full_name: string;
}

interface Evaluation {
  id: string;
  title: string;
}

interface Grade {
  student_id: string;
  evaluation_id: string;
  score: number;
  total_points: number;
}

export default function CourseGrades({ courseId }: CourseGradesProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGradesData();
  }, [courseId]);

  const loadGradesData = async () => {
    try {
      // Cargar estudiantes inscritos
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("course_enrollments")
        .select("student_id")
        .eq("course_id", courseId);

      if (enrollmentsError) throw enrollmentsError;

      if (enrollmentsData && enrollmentsData.length > 0) {
        const studentIds = enrollmentsData.map(e => e.student_id);
        const { data: studentsData, error: studentsError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds)
          .order("full_name");

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
      }

      // Cargar evaluaciones
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from("evaluations")
        .select("id, title")
        .eq("course_id", courseId)
        .order("created_at");

      if (evaluationsError) throw evaluationsError;
      setEvaluations(evaluationsData || []);

      // Cargar notas
      const { data: gradesData, error: gradesError } = await supabase
        .from("evaluation_submissions")
        .select("student_id, evaluation_id, score, total_points")
        .in("evaluation_id", (evaluationsData || []).map(e => e.id));

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (studentId: string, evaluationId: string) => {
    return grades.find(g => g.student_id === studentId && g.evaluation_id === evaluationId);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No hay estudiantes inscritos en este curso</p>
        </CardContent>
      </Card>
    );
  }

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No hay evaluaciones creadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Notas</CardTitle>
        <CardDescription>
          Notas de todos los estudiantes en las evaluaciones del curso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 min-w-[200px]">
                  Estudiante
                </th>
                {evaluations.map((evaluation) => (
                  <th key={evaluation.id} className="p-3 text-center font-medium min-w-[120px]">
                    {evaluation.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium sticky left-0 bg-background">
                    {student.full_name}
                  </td>
                  {evaluations.map((evaluation) => {
                    const grade = getGrade(student.id, evaluation.id);
                    return (
                      <td key={evaluation.id} className="p-3 text-center">
                        {grade ? (
                          <span className="font-semibold">
                            {grade.score.toFixed(1)} / {grade.total_points}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            -
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
