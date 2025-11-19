import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

interface CourseGradesProps {
  courseId: string;
  userRole: "teacher" | "student" | "administrator";
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

export default function CourseGrades({ courseId, userRole }: CourseGradesProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGradesData();
  }, [courseId]);

  useEffect(() => {
    if (evaluations.length > 0) {
      const defaultWeight = 1 / evaluations.length;
      const initialWeights: Record<string, number> = {};
      evaluations.forEach(evaluation => {
        initialWeights[evaluation.id] = defaultWeight;
      });
      setWeights(initialWeights);
      setTempWeights(initialWeights);
    }
  }, [evaluations]);

  const loadGradesData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (userRole === "teacher" || userRole === "administrator") {
        // Cargar todos los estudiantes inscritos (vista de profesor)
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
      } else {
        // Cargar solo el perfil del estudiante actual
        const { data: studentData, error: studentError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", user.id)
          .single();

        if (studentError) throw studentError;
        setStudents(studentData ? [studentData] : []);
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
      const gradesQuery = supabase
        .from("evaluation_submissions")
        .select("student_id, evaluation_id, score, total_points")
        .in("evaluation_id", (evaluationsData || []).map(e => e.id));

      // Si es estudiante, filtrar solo sus notas
      if (userRole === "student") {
        gradesQuery.eq("student_id", user.id);
      }

      const { data: gradesData, error: gradesError } = await gradesQuery;

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

  const calculateFinalAverage = (studentId: string) => {
    let totalWeightedScore = 0;
    let totalWeightUsed = 0;

    evaluations.forEach((evaluation) => {
      const grade = getGrade(studentId, evaluation.id);
      if (grade && grade.score !== null) {
        // Promedio final = suma de (score * peso)
        totalWeightedScore += grade.score * (weights[evaluation.id] || 0);
        totalWeightUsed += weights[evaluation.id] || 0;
      }
    });

    if (totalWeightUsed === 0) return null;
    return totalWeightedScore;
  };

  const handleSaveWeights = () => {
    const sum = Object.values(tempWeights).reduce((acc, val) => acc + val, 0);
    if (Math.abs(sum - 1) > 0.001) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La suma de los pesos debe ser igual a 1",
      });
      return;
    }
    setWeights(tempWeights);
    setDialogOpen(false);
    toast({
      title: "Éxito",
      description: "Los pesos se han guardado correctamente",
    });
  };

  const handleWeightChange = (evalId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= 1) {
      setTempWeights(prev => ({
        ...prev,
        [evalId]: numValue
      }));
    }
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {(userRole === "teacher" || userRole === "administrator") ? "Registro de Notas" : "Mis Notas"}
            </CardTitle>
            <CardDescription>
              {(userRole === "teacher" || userRole === "administrator")
                ? "Notas de todos los estudiantes en las evaluaciones del curso"
                : "Tus calificaciones y promedio final del curso"
              }
            </CardDescription>
          </div>
          {(userRole === "teacher" || userRole === "administrator") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Pesos de Evaluaciones
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurar Pesos de Evaluaciones</DialogTitle>
                  <DialogDescription>
                    Asigna un peso a cada evaluación (0-1). La suma debe ser igual a 1.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center gap-4">
                      <Label className="flex-1 text-sm">{evaluation.title}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={tempWeights[evaluation.id] || 0}
                        onChange={(e) => handleWeightChange(evaluation.id, e.target.value)}
                        className="w-24"
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Suma actual: {Object.values(tempWeights).reduce((acc, val) => acc + val, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveWeights}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
                <th className="p-3 text-center font-medium min-w-[120px] bg-primary/10">
                  Promedio Final
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const finalAverage = calculateFinalAverage(student.id);
                return (
                  <tr key={student.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium sticky left-0 bg-background">
                      {student.full_name}
                    </td>
                    {evaluations.map((evaluation) => {
                      const grade = getGrade(student.id, evaluation.id);
                      return (
                        <td key={evaluation.id} className="p-3 text-center">
                          {grade && grade.score !== null && grade.total_points !== null ? (
                            <span className="font-semibold">
                              {grade.score.toFixed(1)} / {grade.total_points}
                            </span>
                          ) : grade ? (
                            <span className="text-muted-foreground text-sm">
                              Por calificar
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center bg-primary/5">
                      {finalAverage !== null ? (
                        <span className="font-bold text-lg">
                          {finalAverage.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
