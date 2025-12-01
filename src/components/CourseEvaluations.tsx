import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Clock, CheckCircle, XCircle, Edit } from "lucide-react";
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
  userRole: "teacher" | "student" | "administrator";
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
  const [optionInputs, setOptionInputs] = useState<string[]>(["", "", "", ""]);
  const [showPointsAlert, setShowPointsAlert] = useState(false);
  const [pendingSave, setPendingSave] = useState<"create" | "update" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEvaluations();
    if (userRole === "student") {
      loadUserSubmissions();
    }

    // Escuchar cuando la página se vuelve visible para recargar submissions
    const handleVisibilityChange = () => {
      if (!document.hidden && userRole === "student") {
        loadUserSubmissions();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
    setOptionInputs(["", "", "", ""]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    setOptionInputs([...optionInputs, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (optionInputs.length <= 2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe haber al menos 2 opciones",
      });
      return;
    }
    const newOptions = optionInputs.filter((_, i) => i !== index);
    setOptionInputs(newOptions);
    const filteredOptions = newOptions.filter(o => o.trim());
    setCurrentQuestion({ ...currentQuestion, options: filteredOptions });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...optionInputs];
    newOptions[index] = value;
    setOptionInputs(newOptions);
    const filteredOptions = newOptions.filter(o => o.trim());
    setCurrentQuestion({ ...currentQuestion, options: filteredOptions });
  };

  const validateAndProceed = (action: "create" | "update") => {
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

    // Validar que la suma de puntos sea 20
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints !== 20) {
      setPendingSave(action);
      setShowPointsAlert(true);
      return;
    }

    // Si suma 20, proceder directamente
    if (action === "create") {
      executeCreateEvaluation();
    } else {
      executeUpdateEvaluation();
    }
  };

  const handleRedistributePoints = () => {
    // Redistribuir puntos equitativamente
    const pointsPerQuestion = 20 / questions.length;
    const redistributedQuestions = questions.map(q => ({
      ...q,
      points: Math.round(pointsPerQuestion * 100) / 100, // Redondear a 2 decimales
    }));
    
    // Ajustar el último para que sume exactamente 20
    const currentSum = redistributedQuestions.slice(0, -1).reduce((sum, q) => sum + q.points, 0);
    redistributedQuestions[redistributedQuestions.length - 1].points = Math.round((20 - currentSum) * 100) / 100;
    
    setQuestions(redistributedQuestions);
    setShowPointsAlert(false);
    
    // Proceder con el guardado usando las preguntas redistribuidas directamente
    if (pendingSave === "create") {
      executeCreateEvaluation(redistributedQuestions);
    } else if (pendingSave === "update") {
      executeUpdateEvaluation(redistributedQuestions);
    }
    setPendingSave(null);
  };

  const handleCreateEvaluation = () => {
    validateAndProceed("create");
  };

  const executeCreateEvaluation = async (questionsToUse?: Question[]) => {
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

      const questionsToInsert = (questionsToUse || questions).map((q) => ({
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

  const handleUpdateEvaluation = () => {
    if (!editingEvaluation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay evaluación seleccionada para editar",
      });
      return;
    }
    validateAndProceed("update");
  };

  const executeUpdateEvaluation = async (questionsToUse?: Question[]) => {
    if (!editingEvaluation) return;

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

  const handleEditEvaluation = async (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation);
    
    // Cargar las preguntas existentes de la evaluación
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from("evaluation_questions")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .order("order_number");

      if (questionsError) throw questionsError;

      const loadedQuestions = questionsData?.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        order_number: q.order_number,
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correct_answer: q.correct_answer,
        points: q.points || 1,
      })) || [];
      
      setQuestions(loadedQuestions);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar preguntas",
        description: error.message,
      });
    }
    
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

  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta evaluación? Esto eliminará también todas las notas y respuestas asociadas.")) {
      return;
    }

    try {
      // Primero obtener todas las submissions asociadas a esta evaluación
      const { data: submissions, error: submissionsError } = await supabase
        .from("evaluation_submissions")
        .select("id")
        .eq("evaluation_id", evaluationId);

      if (submissionsError) throw submissionsError;

      // Eliminar todas las respuestas de estas submissions
      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map(s => s.id);
        const { error: answersError } = await supabase
          .from("evaluation_answers")
          .delete()
          .in("submission_id", submissionIds);

        if (answersError) throw answersError;
      }

      // Eliminar las submissions
      const { error: submissionsDeleteError } = await supabase
        .from("evaluation_submissions")
        .delete()
        .eq("evaluation_id", evaluationId);

      if (submissionsDeleteError) throw submissionsDeleteError;

      // Eliminar las preguntas
      const { error: questionsError } = await supabase
        .from("evaluation_questions")
        .delete()
        .eq("evaluation_id", evaluationId);

      if (questionsError) throw questionsError;

      // Finalmente eliminar la evaluación
      const { error: evalError } = await supabase
        .from("evaluations")
        .delete()
        .eq("id", evaluationId);

      if (evalError) throw evalError;

      toast({
        title: "Éxito",
        description: "Evaluación eliminada correctamente",
      });

      loadEvaluations();
      if (userRole === "student") {
        loadUserSubmissions();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
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

      // Subir archivos primero
      const uploadedAnswers: Record<string, any> = {};
      for (const questionId in studentAnswers) {
        const answer = studentAnswers[questionId];
        const question = evaluationQuestions.find(q => q.id === questionId);
        
        if (question?.question_type === "file_upload" && answer instanceof File) {
          const fileName = `${user.user.id}/${Date.now()}_${answer.name}`;
          const filePath = `${courseId}/evaluations/${takingEvaluation.id}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("course-files")
            .upload(filePath, answer, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from("course-files")
            .getPublicUrl(filePath);

          uploadedAnswers[questionId] = publicUrl;
        } else {
          uploadedAnswers[questionId] = answer;
        }
      }

      // Calcular puntuación
      const { score, totalPoints } = calculateScore(evaluationQuestions, uploadedAnswers);

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
        const studentAnswer = uploadedAnswers[q.id!] || null;
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
      {(userRole === "teacher" || userRole === "administrator") && (
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Preguntas Agregadas</h3>
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border-2 border-primary/20 shadow-sm">
                      <span className="text-2xl font-bold text-primary">{questions.length}</span>
                      <span className="text-sm text-muted-foreground">pregunta{questions.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                {questions.map((q, index) => (
                  <Card key={index} className="mb-2 border-l-4 border-l-primary/50">
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

                <Card className="mt-4 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 shadow-md">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Agregar Nueva Pregunta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-3">
                      <Label className="flex items-center justify-between mb-2">
                        <span>Pregunta</span>
                      </Label>
                      <Textarea
                        value={currentQuestion.question_text}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                        placeholder="Escribe tu pregunta aquí"
                        className="min-h-[140px]"
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
                      <div className="space-y-3">
                        <Label>Opciones</Label>
                        {optionInputs.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Opción ${index + 1}`}
                              />
                            </div>
                            {optionInputs.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveOption(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddOption}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Opción
                        </Button>
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

                    <Button 
                      onClick={addQuestion} 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Agregar Pregunta
                    </Button>
                  </CardContent>
                </Card>
                </div>
              )}

              <Button 
                onClick={editingEvaluation ? handleUpdateEvaluation : handleCreateEvaluation} 
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-md"
              >
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
              <Card 
                key={evaluation.id} 
                className={`hover:shadow-md transition-shadow ${(userRole === "teacher" || userRole === "administrator") ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (userRole === "teacher" || userRole === "administrator") {
                    navigate(`/courses/${courseId}/evaluations/${evaluation.id}/stats`);
                  }
                }}
              >
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
                      {(userRole === "teacher" || userRole === "administrator") && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvaluation(evaluation);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvaluation(evaluation.id);
                            }}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                    {userRole === "student" && !userSubmissions[evaluation.id] && (
                      <Button onClick={() => handleTakeEvaluation(evaluation)}>
                        Tomar Evaluación
                      </Button>
                    )}
                    {userRole === "student" && userSubmissions[evaluation.id] && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/courses/${courseId}/evaluations/${evaluation.id}/view`)}
                      >
                        Ver mis respuestas
                      </Button>
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
                    <div className="space-y-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setStudentAnswers({ ...studentAnswers, [question.id!]: file });
                          }
                        }}
                      />
                      {studentAnswers[question.id!] instanceof File && (
                        <p className="text-sm text-muted-foreground">
                          Archivo seleccionado: {(studentAnswers[question.id!] as File).name}
                        </p>
                      )}
                    </div>
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

      {/* AlertDialog para validar suma de puntos */}
      <AlertDialog open={showPointsAlert} onOpenChange={setShowPointsAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Puntaje Total Incorrecto</AlertDialogTitle>
            <AlertDialogDescription>
              La suma de los puntos de todas las preguntas debe ser exactamente 20. 
              Actualmente suma {questions.reduce((sum, q) => sum + q.points, 0)} puntos.
              <br /><br />
              ¿Deseas que se asigne automáticamente el mismo puntaje a todas las preguntas para que sumen 20?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSave(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRedistributePoints}>
              Redistribuir Puntos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
