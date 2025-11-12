import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  userRole: "teacher" | "student";
}

export default function CourseEvaluations({ courseId, userRole }: CourseEvaluationsProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
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
  }, [courseId]);

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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditEvaluation(evaluation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Inicio: {format(new Date(evaluation.start_date), "dd/MM/yyyy HH:mm")}</span>
                    <span>Fin: {format(new Date(evaluation.end_date), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
