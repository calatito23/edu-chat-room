import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, Trash2, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Gestor de archivos del curso
 * 
 * Funcionalidades:
 * - Subir archivos al curso
 * - Descargar archivos
 * - Ver lista de archivos con información
 * - Eliminar propios archivos
 * 
 * Almacenamiento:
 * - Usa Supabase Storage (bucket: course-files)
 * - Registra metadatos en tabla 'files'
 * - Organiza por curso en carpetas
 * 
 * Permisos:
 * - Todos los miembros pueden subir archivos
 * - Todos pueden descargar
 * - Solo el que subió puede eliminar
 */
interface CourseFilesProps {
  courseId: string;
  userRole: "student" | "teacher";
  teacherId: string;
  initialWeek?: number;
}

const CourseFiles = ({ courseId, userRole, teacherId, initialWeek }: CourseFilesProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState<number | null>(null); // Ahora guarda el número de semana
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string>(initialWeek ? `week-${initialWeek}` : "");

  useEffect(() => {
    getCurrentUser();
    loadFiles();
  }, [courseId]);

  useEffect(() => {
    if (initialWeek) {
      setExpandedWeek(`week-${initialWeek}`);
      // Scroll to the week section after a short delay
      setTimeout(() => {
        const element = document.getElementById(`week-${initialWeek}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [initialWeek]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadFiles = async () => {
    try {
      // Cargar archivos
      const { data: filesData, error: filesError } = await supabase
        .from("files")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (filesError) {
        toast({
          title: "Error al cargar archivos",
          description: filesError.message,
          variant: "destructive",
        });
        throw filesError;
      }

      // Cargar perfiles de los uploaders
      const uploaderIds = [...new Set(filesData?.map(f => f.uploader_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uploaderIds);

      // Combinar datos
      const filesWithProfiles = filesData?.map(file => ({
        ...file,
        profiles: profilesData?.find(p => p.id === file.uploader_id) || null
      })) || [];

      setFiles(filesWithProfiles);
    } catch (error) {
      console.error("Error loading files:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, weekNumber: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Solo profesores pueden subir archivos
    if (userRole !== "teacher") {
      toast({
        title: "Permiso denegado",
        description: "Solo los profesores pueden subir archivos",
        variant: "destructive",
      });
      return;
    }

    setUploading(weekNumber);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Upload to storage
      const filePath = `${courseId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("course-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from("files")
        .insert({
          course_id: courseId,
          uploader_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          week_number: weekNumber,
        });

      if (dbError) throw dbError;

      // Recargar archivos antes de mostrar el toast
      await loadFiles();
      
      toast({
        title: "Archivo subido",
        description: `Archivo subido a la Semana ${weekNumber}`,
      });

      e.target.value = ""; // Reset input
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error al subir archivo",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("course-files")
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Archivo descargado",
        description: "El archivo se ha descargado exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al descargar",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: any) => {
    if (!confirm(`¿Eliminar ${file.file_name}?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("course-files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado exitosamente",
      });

      loadFiles();
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message || "Intenta nuevamente",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Agrupar archivos por semana
  const filesByWeek: { [key: number]: any[] } = {};
  for (let i = 1; i <= 16; i++) {
    filesByWeek[i] = files.filter(f => f.week_number === i);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Material por Semanas</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" value={expandedWeek} onValueChange={setExpandedWeek}>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((weekNumber) => {
              const weekFiles = filesByWeek[weekNumber] || [];
              return (
                <AccordionItem key={weekNumber} value={`week-${weekNumber}`} id={`week-${weekNumber}`}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">Semana {weekNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        {weekFiles.length} {weekFiles.length === 1 ? "archivo" : "archivos"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {/* Botón de subir archivo (solo profesores) */}
                      {userRole === "teacher" && (
                        <div className="flex justify-end">
                          <label htmlFor={`file-upload-week-${weekNumber}`}>
                            <Button 
                              disabled={uploading === weekNumber} 
                              asChild
                              size="sm"
                            >
                              <span className="cursor-pointer">
                                {uploading === weekNumber ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                {uploading === weekNumber ? "Subiendo..." : "Subir Archivo"}
                              </span>
                            </Button>
                          </label>
                          <Input
                            id={`file-upload-week-${weekNumber}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => handleUpload(e, weekNumber)}
                            disabled={uploading === weekNumber}
                          />
                        </div>
                      )}

                      {/* Lista de archivos */}
                      {weekFiles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No hay archivos en esta semana</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {weekFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate text-sm">{file.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.file_size)} •{" "}
                                    {file.profiles?.full_name} •{" "}
                                    {new Date(file.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(file)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {userRole === "teacher" && currentUserId === teacherId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(file)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseFiles;