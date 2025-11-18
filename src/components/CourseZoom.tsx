import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Video, Calendar, Clock, ExternalLink, Trash2, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface CourseZoomProps {
  courseId: string;
}

interface ZoomMeeting {
  id: string;
  meeting_id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
}

interface ZoomRecording {
  id: string;
  meeting_id: string;
  topic: string;
  start_time: string;
  duration: number;
  recording_play_url?: string;
  download_url?: string;
  file_type?: string;
  file_size?: number;
}

const CourseZoom = ({ courseId }: CourseZoomProps) => {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [recordings, setRecordings] = useState<ZoomRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    topic: "",
    start_time: "",
    duration: 60,
  });

  useEffect(() => {
    loadMeetings();
    loadRecordings();
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
        },
      });

      if (error) throw error;

      toast({
        title: "Reunión creada",
        description: "La reunión de Zoom ha sido creada exitosamente",
      });

      setFormData({ topic: "", start_time: "", duration: 60 });
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

  const loadRecordings = async () => {
    try {
      setLoadingRecordings(true);
      const { data, error } = await supabase
        .from("zoom_recordings")
        .select("*")
        .eq("course_id", courseId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error: any) {
      console.error("Error loading recordings:", error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  const handleSyncRecordings = async (meetingId: string) => {
    try {
      setSyncing(meetingId);
      
      const { data, error } = await supabase.functions.invoke("zoom-sync-recordings", {
        body: {
          meeting_id: meetingId,
          course_id: courseId,
        },
      });

      if (error) throw error;

      toast({
        title: "Grabaciones sincronizadas",
        description: `Se sincronizaron ${data.count || 0} grabaciones`,
      });

      loadRecordings();
    } catch (error: any) {
      console.error("Error syncing recordings:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron sincronizar las grabaciones",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Create Meeting Form */}
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? "Creando..." : "Crear Reunión"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg">{meeting.topic}</h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(meeting.start_time), "dd/MM/yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(meeting.start_time), "HH:mm")} ({meeting.duration} min)
                        </div>
                      </div>

                      {meeting.password && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Contraseña: </span>
                          <span className="font-mono">{meeting.password}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(meeting.join_url, "_blank")}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Unirse a la Reunión
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
                        >
                          Copiar Enlace
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncRecordings(meeting.meeting_id)}
                          disabled={syncing === meeting.meeting_id}
                          className="flex items-center gap-1"
                        >
                          <RefreshCw className={`h-4 w-4 ${syncing === meeting.meeting_id ? 'animate-spin' : ''}`} />
                          Sincronizar Grabaciones
                        </Button>
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Grabaciones Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecordings ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando grabaciones...
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay grabaciones disponibles</p>
              <p className="text-sm mt-2">
                Las grabaciones se sincronizan automáticamente después de que termina la reunión
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{recording.topic}</h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(recording.start_time), "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(recording.start_time), "HH:mm")} ({recording.duration} min)
                      </div>
                      {recording.file_type && (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          {recording.file_type} ({formatFileSize(recording.file_size)})
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {recording.recording_play_url && (
                        <Button
                          size="sm"
                          onClick={() => window.open(recording.recording_play_url, "_blank")}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver Grabación
                        </Button>
                      )}
                      {recording.download_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(recording.download_url, "_blank")}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      )}
                    </div>
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
