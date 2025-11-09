import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, Trash2, Loader2 } from "lucide-react";

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
}

const CourseFiles = ({ courseId, userRole, teacherId }: CourseFilesProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
    loadFiles();
  }, [courseId]);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);

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
        });

      if (dbError) throw dbError;

      // Recargar archivos antes de mostrar el toast
      await loadFiles();
      
      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido exitosamente",
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
      setUploading(false);
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

  return (
    <div className="space-y-6">
      {userRole === "teacher" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Subir Archivo</span>
              <label htmlFor="file-upload">
                <Button disabled={uploading} asChild>
                  <span className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? "Subiendo..." : "Seleccionar Archivo"}
                  </span>
                </Button>
              </label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Archivos del Curso ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay archivos en este curso</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{file.file_name}</p>
                      <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseFiles;