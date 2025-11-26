import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

interface Submission {
  id: string;
  submitted_at: string;
  score: number | null;
  total_points: number | null;
}

export default function StudentEvaluationView() {
  const { courseId, evaluationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [evaluationId]);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      // Cargar evaluación
      const { data: evalData, error: evalError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("id", evaluationId)
        .single();

      if (evalError) throw evalError;
      setEvaluation(evalData);

      // Cargar submission del estudiante
      const { data: submissionData, error: submissionError } = await supabase
        .from("evaluation_submissions")
        .select("*")
        .eq("evaluation_id", evaluationId)
        .eq("student_id", user.user.id)
        .single();

      if (submissionError) throw submissionError;
      setSubmission(submissionData);

      // Cargar respuestas del estudiante
      const { data: answersData, error: answersError } = await supabase
        .from("evaluation_answers")
        .select(`
          *,
          evaluation_questions (*)
        `)
        .eq("submission_id", submissionData.id);

      if (answersError) throw answersError;

      const transformedAnswers = (answersData || []).map(a => ({
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

      setAnswers(transformedAnswers as Answer[]);
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

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al curso
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No has entregado esta evaluación aún</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            Tu entrega y calificación
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Fecha de entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {format(new Date(submission.submitted_at), "dd/MM/yyyy HH:mm")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tu nota</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submission.score?.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Puntuación máxima</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submission.total_points || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tus respuestas</CardTitle>
            <CardDescription>
              Revisa tus respuestas y la calificación obtenida en cada pregunta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {answers.map((answer, index) => {
                const question = answer.evaluation_questions;
                
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
                        <p className="text-sm font-medium text-muted-foreground">Tu respuesta:</p>
                        {question.question_type === "file_upload" ? (
                          (() => {
                            try {
                              const fileData = JSON.parse(answer.answer);
                              return (
                                <div className="flex items-center gap-2 mt-1">
                                  <a
                                    href={fileData.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                  >
                                    📎 {fileData.fileName}
                                  </a>
                                </div>
                              );
                            } catch {
                              return <p className="text-sm mt-1">{answer.answer || "Sin respuesta"}</p>;
                            }
                          })()
                        ) : (
                          <p className="text-sm mt-1">
                            {Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer || "Sin respuesta"}
                          </p>
                        )}
                      </div>
                      
                      {question.question_type !== "short_answer" && 
                       question.question_type !== "file_upload" && 
                       question.question_type !== "matching" && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Respuesta correcta:</p>
                          <p className="text-sm mt-1">
                            {Array.isArray(question.correct_answer) 
                              ? question.correct_answer.join(", ") 
                              : question.correct_answer}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Puntos obtenidos:
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl font-bold">
                              {answer.points_earned?.toFixed(2) || "0.00"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              / {question.points}
                            </span>
                          </div>
                        </div>
                        
                        {answer.is_correct !== null && (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
