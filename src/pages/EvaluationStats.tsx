import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Submission {
  id: string;
  student_id: string;
  submitted_at: string;
  score: number | null;
  total_points: number | null;
  profiles?: {
    full_name: string;
  };
}

interface Answer {
  id: string;
  question_id: string;
  answer: any;
  is_correct: boolean | null;
  points_earned: number | null;
  evaluation_questions: {
    id: string;
    question_text: string;
    question_type: string;
    correct_answer: any;
    points: number;
    options?: string[];
  };
}

export default function EvaluationStats() {
  const { courseId, evaluationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [viewingAnswers, setViewingAnswers] = useState<{ submission: Submission; answers: Answer[] } | null>(null);
  const [editedPoints, setEditedPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [evaluationId]);

  const loadData = async () => {
    try {
      // Cargar evaluación
      const { data: evalData, error: evalError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("id", evaluationId)
        .single();

      if (evalError) throw evalError;
      setEvaluation(evalData);

      // Cargar submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("evaluation_submissions")
        .select("*")
        .eq("evaluation_id", evaluationId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      // Cargar perfiles
      if (submissionsData && submissionsData.length > 0) {
        const studentIds = submissionsData.map(s => s.student_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const submissionsWithProfiles = submissionsData.map(sub => ({
          ...sub,
          profiles: profilesMap.get(sub.student_id),
        }));

        setSubmissions(submissionsWithProfiles as Submission[]);
      }
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

  const handleViewAnswers = async (submission: Submission) => {
    try {
      const { data, error } = await supabase
        .from("evaluation_answers")
        .select(`
          *,
          evaluation_questions (*)
        `)
        .eq("submission_id", submission.id);

      if (error) throw error;

      const transformedAnswers = (data || []).map(a => ({
        ...a,
        evaluation_questions: {
          ...a.evaluation_questions,
          options: Array.isArray(a.evaluation_questions.options) 
            ? a.evaluation_questions.options as string[]
            : [],
        }
      })).sort((a, b) => 
        a.evaluation_questions.order_number - b.evaluation_questions.order_number
      );

      // Inicializar puntos editables
      const initialPoints: Record<string, number> = {};
      transformedAnswers.forEach(answer => {
        initialPoints[answer.id] = answer.points_earned || 0;
      });
      setEditedPoints(initialPoints);

      setViewingAnswers({ submission, answers: transformedAnswers as Answer[] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleSaveGrades = async () => {
    if (!viewingAnswers) return;

    setSaving(true);
    try {
      // Actualizar cada respuesta con los puntos editados
      for (const [answerId, points] of Object.entries(editedPoints)) {
        const answer = viewingAnswers.answers.find(a => a.id === answerId);
        if (!answer) continue;

        const { error } = await supabase
          .from("evaluation_answers")
          .update({ 
            points_earned: points,
            is_correct: points === answer.evaluation_questions.points
          })
          .eq("id", answerId);

        if (error) throw error;
      }

      // Recalcular puntaje total
      const totalEarned = Object.values(editedPoints).reduce((sum, points) => sum + points, 0);
      const totalPossible = viewingAnswers.answers.reduce(
        (sum, answer) => sum + answer.evaluation_questions.points, 
        0
      );

      const { error: submissionError } = await supabase
        .from("evaluation_submissions")
        .update({
          score: totalEarned,
          total_points: totalPossible,
        })
        .eq("id", viewingAnswers.submission.id);

      if (submissionError) throw submissionError;

      toast({
        title: "Éxito",
        description: "Calificaciones guardadas correctamente",
      });

      setViewingAnswers(null);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRetryEvaluation = async (submission: Submission) => {
    try {
      // Eliminar las respuestas primero
      const { error: answersError } = await supabase
        .from("evaluation_answers")
        .delete()
        .eq("submission_id", submission.id);

      if (answersError) throw answersError;

      // Eliminar la submission
      const { error: submissionError } = await supabase
        .from("evaluation_submissions")
        .delete()
        .eq("id", submission.id);

      if (submissionError) throw submissionError;

      toast({
        title: "Éxito",
        description: "El alumno puede volver a dar el examen",
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const needsManualReview = (answer: Answer) => {
    const question = answer.evaluation_questions;
    
    // Solo necesita revisión manual si:
    // 1. No hay respuesta correcta definida
    // 2. O es pregunta de texto/archivo/matching
    const hasNoCorrectAnswer = !question.correct_answer || 
      (typeof question.correct_answer === 'string' && question.correct_answer.trim() === '') ||
      (Array.isArray(question.correct_answer) && question.correct_answer.length === 0);
    
    const isOpenQuestion = question.question_type === "short_answer" || 
                          question.question_type === "file_upload" || 
                          question.question_type === "matching";
    
    return hasNoCorrectAnswer || isOpenQuestion;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al curso
          </Button>
          
          <h1 className="text-3xl font-bold">{evaluation?.title}</h1>
          <p className="text-muted-foreground mt-2">
            Estadísticas y resultados de la evaluación
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total de entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submissions.length > 0
                  ? (submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.length).toFixed(2)
                  : "0.00"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Puntuación máxima</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submissions.length > 0 ? submissions[0].total_points || 0 : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No hay entregas aún</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Entregas de estudiantes</CardTitle>
              <CardDescription>
                Lista de todos los estudiantes que han completado la evaluación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => handleViewAnswers(submission)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{submission.profiles?.full_name || "Usuario"}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Entregado: {format(new Date(submission.submitted_at), "dd/MM/yyyy HH:mm")}</span>
                        <span className="font-semibold">
                          Nota: {submission.score?.toFixed(2)} / {submission.total_points}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryEvaluation(submission);
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Nuevo intento
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para ver y calificar respuestas */}
      <Dialog open={!!viewingAnswers} onOpenChange={(open) => !open && setViewingAnswers(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Respuestas de {viewingAnswers?.submission.profiles?.full_name || "Usuario"}</span>
              <Button onClick={handleSaveGrades} disabled={saving} size="sm">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar calificaciones"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {viewingAnswers?.answers.map((answer, index) => {
              const question = answer.evaluation_questions;
              const needsReview = needsManualReview(answer);
              
              return (
                <Card key={answer.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {index + 1}. {question.question_text}
                    </CardTitle>
                    <CardDescription>
                      Puntaje máximo: {question.points} puntos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Respuesta del estudiante:</p>
                      {question.question_type === "file_upload" && answer.answer ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="mt-2"
                        >
                          <a
                            href={answer.answer as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          >
                            Descargar archivo
                          </a>
                        </Button>
                      ) : (
                        <p className="text-sm">
                          {Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer || "Sin respuesta"}
                        </p>
                      )}
                    </div>
                    {!needsReview && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Respuesta correcta:</p>
                        <p className="text-sm">
                          {Array.isArray(question.correct_answer) 
                            ? question.correct_answer.join(", ") 
                            : question.correct_answer}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Puntos obtenidos:
                        </p>
                        <div className="flex items-center gap-2">
                          {question.question_type === "short_answer" || question.question_type === "file_upload" ? (
                            <Input
                              type="number"
                              min="0"
                              max={question.points}
                              step="0.1"
                              value={editedPoints[answer.id] || 0}
                              onChange={(e) => {
                                const value = Math.min(
                                  Math.max(0, parseFloat(e.target.value) || 0),
                                  question.points
                                );
                                setEditedPoints(prev => ({
                                  ...prev,
                                  [answer.id]: value
                                }));
                              }}
                              className="w-24"
                            />
                          ) : (
                            <span className="text-base font-semibold">
                              {answer.points_earned || 0}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            / {question.points}
                          </span>
                        </div>
                      </div>
                      {question.question_type !== "short_answer" && question.question_type !== "file_upload" && (
                        <div className={`px-3 py-1 rounded text-sm font-medium ${
                          answer.is_correct 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {answer.is_correct ? "Correcta" : "Incorrecta"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
