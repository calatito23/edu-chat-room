import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Video, Calendar, Clock, ExternalLink, Trash2, Upload as UploadIcon } from "lucide-react";
import { format } from "date-fns";

interface CourseZoomProps {
  courseId: string;
  userRole: "teacher" | "student" | "administrator";
}

interface ZoomMeeting {
  id: string;
  meeting_id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
  week_number: number;
}


const CourseZoom = ({ courseId, userRole }: CourseZoomProps) => {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    topic: "",
    start_time: "",
    duration: 60,
    week_number: 1,
  });

  useEffect(() => {
    loadMeetings();
  }, [courseId]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("zoom_meetings")
        .select("*")
        .eq("course_id", courseId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      console.error("Error loading meetings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reuniones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic || !formData.start_time) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      // Convert local datetime to ISO format
      const startTimeISO = new Date(formData.start_time).toISOString();

      const { data, error } = await supabase.functions.invoke("zoom-create-meeting", {
        body: {
          topic: formData.topic,
          start_time: startTimeISO,
          duration: formData.duration,
          course_id: courseId,
          week_number: formData.week_number,
        },
      });

      if (error) throw error;

      toast({
        title: "Reunión creada",
        description: "La reunión de Zoom ha sido creada exitosamente",
      });

      setFormData({ topic: "", start_time: "", duration: 60, week_number: 1 });
      loadMeetings();
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la reunión",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUploadRecording = async (e: React.ChangeEvent<HTMLInputElement>, meetingId: string, weekNumber: number, meetingTopic: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRecording(meetingId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Upload to storage
      const filePath = `${courseId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("course-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database marking it as a recording
      const { error: dbError } = await supabase
        .from("files")
        .insert({
          course_id: courseId,
          uploader_id: user.id,
          file_name: `Grabación: ${meetingTopic}`,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          week_number: weekNumber,
          is_recording: true,
        });

      if (dbError) throw dbError;

      toast({
        title: "Grabación subida",
        description: "La grabación se ha guardado exitosamente",
      });

      // Reset the input
      e.target.value = '';
    } catch (error: any) {
      console.error("Error uploading recording:", error);
      toast({
        title: "Error al subir grabación",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUploadingRecording(null);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from("zoom_meetings")
        .delete()
        .eq("id", meetingId);

      if (error) throw error;

      toast({
        title: "Reunión eliminada",
        description: "La reunión ha sido eliminada",
      });

      loadMeetings();
    } catch (error: any) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la reunión",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Create Meeting Form - Only for teachers */}
      {(userRole === "teacher" || userRole === "administrator") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Crear Nueva Reunión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Tema de la Reunión *</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                  placeholder="Ej: Clase de Plataformas Digitales"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Fecha y Hora *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="240"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="week_number">Semana</Label>
                  <Select 
                    value={formData.week_number.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, week_number: parseInt(value) })}
                  >
                    <SelectTrigger id="week_number">
                      <SelectValue placeholder="Seleccionar semana" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((week) => (
                        <SelectItem key={week} value={week.toString()}>
                          Semana {week}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Creando..." : "Crear Reunión"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle>Reuniones Programadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando reuniones...
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay reuniones programadas
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{meeting.topic}</h3>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.start_time), "dd/MM/yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(meeting.start_time), "HH:mm")} ({meeting.duration} min)
                        </div>
                        <div className="flex items-center gap-1 font-medium text-primary">
                          Semana {meeting.week_number}
                        </div>
                        {meeting.password && (
                          <div className="flex items-center gap-1">
                            <span>Contraseña: </span>
                            <span className="font-mono">{meeting.password}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => window.open(meeting.join_url, "_blank")}
                          className="flex items-center gap-1 h-8 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Unirse
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(meeting.join_url);
                            toast({
                              title: "Copiado",
                              description: "El enlace ha sido copiado al portapapeles",
                            });
                          }}
                          className="h-8 text-xs"
                        >
                          Copiar
                        </Button>
                        {(userRole === "teacher" || userRole === "administrator") && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => document.getElementById(`recording-input-${meeting.id}`)?.click()}
                              disabled={uploadingRecording === meeting.id}
                              className="flex items-center gap-1 h-8 text-xs"
                            >
                              {uploadingRecording === meeting.id ? (
                                <>
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <UploadIcon className="h-3 w-3" />
                                  Subir Grabación
                                </>
                              )}
                            </Button>
                            <input
                              id={`recording-input-${meeting.id}`}
                              type="file"
                              accept="video/*,audio/*"
                              className="hidden"
                              onChange={(e) => handleUploadRecording(e, meeting.id, meeting.week_number, meeting.topic)}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {(userRole === "teacher" || userRole === "administrator") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
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

export default CourseZoom;
