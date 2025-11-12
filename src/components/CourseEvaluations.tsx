import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Clock, CheckCircle, XCircle, Edit, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Evaluation {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface Question {
  id?: string;
  question_text: string;
  question_type: string;
  order_number: number;
  options?: string[];
  correct_answer: any;
  points: number;
}

interface CourseEvaluationsProps {
  courseId: string;
  userRole: "teacher" | "student";
}

export default function CourseEvaluations({ courseId, userRole }: CourseEvaluationsProps) {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [takingEvaluation, setTakingEvaluation] = useState<Evaluation | null>(null);
  const [evaluationQuestions, setEvaluationQuestions] = useState<Question[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [userSubmissions, setUserSubmissions] = useState<Record<string, boolean>>({});
  const [newEval, setNewEval] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: "",
    question_type: "short_answer",
    order_number: 0,
    options: [],
    correct_answer: "",
    points: 1,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEvaluations();
    if (userRole === "student") {
      loadUserSubmissions();
    }
  }, [courseId, userRole]);

  const loadUserSubmissions = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("evaluation_submissions")
        .select("evaluation_id")
        .eq("student_id", user.user.id);

      if (error) throw error;

      const submissionsMap: Record<string, boolean> = {};
      data?.forEach((sub) => {
        submissionsMap[sub.evaluation_id] = true;
      });
      setUserSubmissions(submissionsMap);
    } catch (error: any) {
      console.error("Error loading submissions:", error);
    }
  };

  const loadEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
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

  const addQuestion = () => {
    if (!currentQuestion.question_text) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Escribe la pregunta",
      });
      return;
    }

    setQuestions([...questions, { ...currentQuestion, order_number: questions.length + 1 }]);
    setCurrentQuestion({
      question_text: "",
      question_type: "short_answer",
      order_number: 0,
      options: [],
      correct_answer: "",
      points: 1,
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreateEvaluation = async () => {
    if (!newEval.title || !newEval.start_date || !newEval.end_date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Completa todos los campos requeridos",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Agrega al menos una pregunta",
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      // Convertir datetime-local a ISO string preservando la hora local
      const startDate = new Date(newEval.start_date).toISOString();
      const endDate = new Date(newEval.end_date).toISOString();

      const { data: evalData, error: evalError } = await supabase
        .from("evaluations")
        .insert({
          course_id: courseId,
          title: newEval.title,
          description: newEval.description,
          start_date: startDate,
          end_date: endDate,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (evalError) throw evalError;

      const questionsToInsert = questions.map((q) => ({
        evaluation_id: evalData.id,
        question_text: q.question_text,
        question_type: q.question_type as "short_answer" | "multiple_choice" | "multiple_select" | "file_upload" | "true_false" | "matching",
        order_number: q.order_number,
        options: q.options ? q.options : null,
        correct_answer: q.correct_answer,
        points: q.points,
      }));

      const { error: questionsError } = await supabase
        .from("evaluation_questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Éxito",
        description: "Evaluación creada correctamente",
      });

      setIsDialogOpen(false);
      setNewEval({ title: "", description: "", start_date: "", end_date: "" });
      setQuestions([]);
      loadEvaluations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleUpdateEvaluation = async () => {
    if (!editingEvaluation || !newEval.title || !newEval.start_date || !newEval.end_date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Completa todos los campos requeridos",
      });
      return;
    }

    try {
      // Convertir datetime-local a ISO string preservando la hora local
      const startDate = new Date(newEval.start_date).toISOString();
      const endDate = new Date(newEval.end_date).toISOString();
      
      const { error: evalError } = await supabase
        .from("evaluations")
        .update({
          title: newEval.title,
          description: newEval.description,
          start_date: startDate,
          end_date: endDate,
        })
        .eq("id", editingEvaluation.id);

      if (evalError) throw evalError;

      toast({
        title: "Éxito",
        description: "Evaluación actualizada correctamente",
      });

      setIsDialogOpen(false);
      setEditingEvaluation(null);
      setNewEval({ title: "", description: "", start_date: "", end_date: "" });
      loadEvaluations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEditEvaluation = (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation);
    
    // Convertir las fechas UTC a formato local para el input datetime-local
    const startDate = new Date(evaluation.start_date);
    const endDate = new Date(evaluation.end_date);
    
    // Formatear a YYYY-MM-DDTHH:mm para datetime-local
    const formatToLocalDatetime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setNewEval({
      title: evaluation.title,
      description: evaluation.description || "",
      start_date: formatToLocalDatetime(startDate),
      end_date: formatToLocalDatetime(endDate),
    });
    setIsDialogOpen(true);
  };

  const handleTakeEvaluation = async (evaluation: Evaluation) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      // Cargar preguntas
      const { data: questionsData, error: questionsError } = await supabase
        .from("evaluation_questions")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .order("order_number");

      if (questionsError) throw questionsError;

      setEvaluationQuestions(questionsData?.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : [],
      })) || []);
      setTakingEvaluation(evaluation);
      setStudentAnswers({});
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const needsManualReview = (question: Question) => {
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

  const calculateScore = (questions: Question[], answers: Record<string, any>) => {
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((question) => {
      totalPoints += question.points;
      const studentAnswer = answers[question.id!];
      const correctAnswer = question.correct_answer;

      // Si necesita revisión manual, no sumar puntos automáticamente
      if (needsManualReview(question)) {
        return;
      }

      let isCorrect = false;

      if (question.question_type === "multiple_select") {
        const studentArr = Array.isArray(studentAnswer) ? studentAnswer.sort() : [];
        const correctArr = Array.isArray(correctAnswer) ? correctAnswer.sort() : [];
        isCorrect = JSON.stringify(studentArr) === JSON.stringify(correctArr);
      } else {
        isCorrect = studentAnswer === correctAnswer;
      }

      if (isCorrect) {
        earnedPoints += question.points;
      }
    });

    return { score: earnedPoints, totalPoints };
  };

  const handleSubmitEvaluation = async () => {
    if (!takingEvaluation) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      // Calcular puntuación
      const { score, totalPoints } = calculateScore(evaluationQuestions, studentAnswers);

      // Crear submission
      const { data: submissionData, error: submissionError } = await supabase
        .from("evaluation_submissions")
        .insert({
          evaluation_id: takingEvaluation.id,
          student_id: user.user.id,
          score,
          total_points: totalPoints,
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Insertar respuestas con calificación
      const answersToInsert = evaluationQuestions.map((q) => {
        const studentAnswer = studentAnswers[q.id!] || null;
        const correctAnswer = q.correct_answer;
        
        // Si necesita revisión manual, no calificar
        if (needsManualReview(q)) {
          return {
            submission_id: submissionData.id,
            question_id: q.id,
            answer: studentAnswer,
            is_correct: null,
            points_earned: 0,
          };
        }

        let isCorrect = false;

        if (q.question_type === "multiple_select") {
          const studentArr = Array.isArray(studentAnswer) ? studentAnswer.sort() : [];
          const correctArr = Array.isArray(correctAnswer) ? correctAnswer.sort() : [];
          isCorrect = JSON.stringify(studentArr) === JSON.stringify(correctArr);
        } else {
          isCorrect = studentAnswer === correctAnswer;
        }

        return {
          submission_id: submissionData.id,
          question_id: q.id,
          answer: studentAnswer,
          is_correct: isCorrect,
          points_earned: isCorrect ? q.points : 0,
        };
      });

      const { error: answersError } = await supabase
        .from("evaluation_answers")
        .insert(answersToInsert);

      if (answersError) throw answersError;

      toast({
        title: "Éxito",
        description: "Evaluación enviada correctamente",
      });

      setTakingEvaluation(null);
      setEvaluationQuestions([]);
      setStudentAnswers({});
      loadEvaluations();
      loadUserSubmissions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getEvaluationStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return { label: "Próximamente", icon: Clock, color: "text-yellow-600" };
    if (now > end) return { label: "Finalizada", icon: XCircle, color: "text-red-600" };
    return { label: "Disponible", icon: CheckCircle, color: "text-green-600" };
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando evaluaciones...</div>;
  }

  return (
    <div className="space-y-4">
      {userRole === "teacher" && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingEvaluation(null);
            setNewEval({ title: "", description: "", start_date: "", end_date: "" });
            setQuestions([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Evaluación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvaluation ? "Editar Evaluación" : "Nueva Evaluación"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={newEval.title}
                  onChange={(e) => setNewEval({ ...newEval, title: e.target.value })}
                  placeholder="Título de la evaluación"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={newEval.description}
                  onChange={(e) => setNewEval({ ...newEval, description: e.target.value })}
                  placeholder="Descripción opcional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha y hora de inicio</Label>
                  <Input
                    type="datetime-local"
                    value={newEval.start_date}
                    onChange={(e) => setNewEval({ ...newEval, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fecha y hora de finalización</Label>
                  <Input
                    type="datetime-local"
                    value={newEval.end_date}
                    onChange={(e) => setNewEval({ ...newEval, end_date: e.target.value })}
                  />
                </div>
              </div>

              {!editingEvaluation && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Preguntas ({questions.length})</h3>
                {questions.map((q, index) => (
                  <Card key={index} className="mb-2">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{q.question_text}</p>
                          <p className="text-sm text-muted-foreground">Tipo: {q.question_type} - Puntos: {q.points}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}

                <Card className="mt-4 bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Agregar Pregunta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Pregunta</Label>
                      <Textarea
                        value={currentQuestion.question_text}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                        placeholder="Escribe tu pregunta aquí"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de pregunta</Label>
                        <Select
                          value={currentQuestion.question_type}
                          onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, question_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_answer">Respuesta corta</SelectItem>
                            <SelectItem value="multiple_choice">Opción múltiple</SelectItem>
                            <SelectItem value="multiple_select">Selección múltiple</SelectItem>
                            <SelectItem value="file_upload">Subir archivos</SelectItem>
                            <SelectItem value="true_false">Verdadero/Falso</SelectItem>
                            <SelectItem value="matching">Relacionar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Puntos</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={currentQuestion.points}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    {(currentQuestion.question_type === "multiple_choice" || 
                      currentQuestion.question_type === "multiple_select") && (
                      <div>
                        <Label>Opciones (una por línea)</Label>
                        <Textarea
                          placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                          onChange={(e) => {
                            const opts = e.target.value.split('\n').filter(o => o.trim());
                            setCurrentQuestion({ ...currentQuestion, options: opts });
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Respuesta correcta</Label>
                      {currentQuestion.question_type === "true_false" ? (
                        <Select
                          value={currentQuestion.correct_answer}
                          onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Verdadero</SelectItem>
                            <SelectItem value="false">Falso</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : currentQuestion.question_type === "multiple_select" && currentQuestion.options ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Selecciona las respuestas correctas:</p>
                          {currentQuestion.options.map((option, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <Checkbox
                                id={`option-${idx}`}
                                checked={Array.isArray(currentQuestion.correct_answer) && currentQuestion.correct_answer.includes(option)}
                                onCheckedChange={(checked) => {
                                  const currentAnswers = Array.isArray(currentQuestion.correct_answer) 
                                    ? currentQuestion.correct_answer 
                                    : [];
                                  const newAnswers = checked
                                    ? [...currentAnswers, option]
                                    : currentAnswers.filter(a => a !== option);
                                  setCurrentQuestion({ ...currentQuestion, correct_answer: newAnswers });
                                }}
                              />
                              <Label htmlFor={`option-${idx}`}>{option}</Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Input
                          value={currentQuestion.correct_answer}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                          placeholder="Escribe la respuesta correcta"
                        />
                      )}
                    </div>

                    <Button onClick={addQuestion} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Pregunta
                    </Button>
                  </CardContent>
                </Card>
                </div>
              )}

              <Button onClick={editingEvaluation ? handleUpdateEvaluation : handleCreateEvaluation} className="w-full">
                {editingEvaluation ? "Actualizar Evaluación" : "Crear Evaluación"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-4">
        {evaluations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No hay evaluaciones aún</p>
            </CardContent>
          </Card>
        ) : (
          evaluations.map((evaluation) => {
            const status = getEvaluationStatus(evaluation.start_date, evaluation.end_date);
            const StatusIcon = status.icon;
            
            return (
              <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{evaluation.title}</CardTitle>
                      {evaluation.description && (
                        <CardDescription className="mt-2">{evaluation.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                      {userRole === "teacher" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEvaluation(evaluation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/courses/${courseId}/evaluations/${evaluation.id}/stats`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      <div>Inicio: {format(new Date(evaluation.start_date), "dd/MM/yyyy HH:mm")}</div>
                      <div>Fin: {format(new Date(evaluation.end_date), "dd/MM/yyyy HH:mm")}</div>
                    </div>
                    {userRole === "student" && status.label === "Disponible" && !userSubmissions[evaluation.id] && (
                      <Button onClick={() => handleTakeEvaluation(evaluation)}>
                        Tomar Evaluación
                      </Button>
                    )}
                    {userRole === "student" && userSubmissions[evaluation.id] && (
                      <span className="text-sm text-muted-foreground">Evaluación completada</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Diálogo para tomar evaluación (estudiantes) */}
      <Dialog open={!!takingEvaluation} onOpenChange={(open) => !open && setTakingEvaluation(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{takingEvaluation?.title}</DialogTitle>
            {takingEvaluation?.description && (
              <p className="text-sm text-muted-foreground">{takingEvaluation.description}</p>
            )}
          </DialogHeader>
          <div className="space-y-6">
            {evaluationQuestions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {index + 1}. {question.question_text}
                  </CardTitle>
                  <CardDescription>{question.points} puntos</CardDescription>
                </CardHeader>
                <CardContent>
                  {question.question_type === "short_answer" && (
                    <Textarea
                      placeholder="Escribe tu respuesta aquí"
                      value={studentAnswers[question.id!] || ""}
                      onChange={(e) =>
                        setStudentAnswers({ ...studentAnswers, [question.id!]: e.target.value })
                      }
                    />
                  )}
                  
                  {question.question_type === "multiple_choice" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`q${question.id}-opt${idx}`}
                            name={`question-${question.id}`}
                            value={option}
                            checked={studentAnswers[question.id!] === option}
                            onChange={(e) =>
                              setStudentAnswers({ ...studentAnswers, [question.id!]: e.target.value })
                            }
                          />
                          <Label htmlFor={`q${question.id}-opt${idx}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.question_type === "multiple_select" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Checkbox
                            id={`q${question.id}-opt${idx}`}
                            checked={
                              Array.isArray(studentAnswers[question.id!]) &&
                              studentAnswers[question.id!].includes(option)
                            }
                            onCheckedChange={(checked) => {
                              const current = Array.isArray(studentAnswers[question.id!])
                                ? studentAnswers[question.id!]
                                : [];
                              const newAnswers = checked
                                ? [...current, option]
                                : current.filter((a: string) => a !== option);
                              setStudentAnswers({ ...studentAnswers, [question.id!]: newAnswers });
                            }}
                          />
                          <Label htmlFor={`q${question.id}-opt${idx}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.question_type === "true_false" && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`q${question.id}-true`}
                          name={`question-${question.id}`}
                          value="true"
                          checked={studentAnswers[question.id!] === "true"}
                          onChange={(e) =>
                            setStudentAnswers({ ...studentAnswers, [question.id!]: e.target.value })
                          }
                        />
                        <Label htmlFor={`q${question.id}-true`}>Verdadero</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`q${question.id}-false`}
                          name={`question-${question.id}`}
                          value="false"
                          checked={studentAnswers[question.id!] === "false"}
                          onChange={(e) =>
                            setStudentAnswers({ ...studentAnswers, [question.id!]: e.target.value })
                          }
                        />
                        <Label htmlFor={`q${question.id}-false`}>Falso</Label>
                      </div>
                    </div>
                  )}

                  {question.question_type === "file_upload" && (
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setStudentAnswers({ ...studentAnswers, [question.id!]: file.name });
                        }
                      }}
                    />
                  )}

                  {question.question_type === "matching" && (
                    <Textarea
                      placeholder="Escribe tus respuestas de relacionar aquí"
                      value={studentAnswers[question.id!] || ""}
                      onChange={(e) =>
                        setStudentAnswers({ ...studentAnswers, [question.id!]: e.target.value })
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSubmitEvaluation} className="w-full">
              Enviar Evaluación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
