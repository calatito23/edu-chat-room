import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, User, Trash2 } from "lucide-react";

/**
 * Componente de publicaciones del curso (Stream)
 * 
 * Similar al stream de Google Classroom:
 * - Muestra publicaciones del profesor
 * - Permite al profesor crear nuevas publicaciones
 * - Alumnos y profesores pueden comentar
 * - Orden cronológico inverso (más recientes primero)
 * 
 * Estructura de cada publicación:
 * - Título y contenido
 * - Autor y fecha
 * - Lista de comentarios
 * - Formulario para agregar comentarios
 */
interface CourseStreamProps {
  courseId: string;
  userRole: "student" | "teacher" | "administrator";
}

const CourseStream = ({ courseId, userRole }: CourseStreamProps) => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [showNewPost, setShowNewPost] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [courseId]);

  const loadPosts = async () => {
    try {
      console.log("Loading posts for course:", courseId);
      
      // Query simplificada sin nested relations
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Error loading posts:", postsError);
        toast({
          title: "Error al cargar publicaciones",
          description: postsError.message,
          variant: "destructive",
        });
        return;
      }

      console.log("Posts data:", postsData);

      // Cargar perfiles y comentarios por separado
      if (postsData && postsData.length > 0) {
        // Primero cargar los comentarios
        const postIds = postsData.map(p => p.id);
        const { data: commentsData } = await supabase
          .from("comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        // Combinar todos los author_ids (de posts y comentarios)
        const allAuthorIds = [
          ...new Set([
            ...postsData.map(p => p.author_id),
            ...(commentsData?.map(c => c.author_id) || [])
          ])
        ];

        // Cargar todos los perfiles necesarios
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", allAuthorIds);

        // Cargar los roles de todos los usuarios
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("*")
          .in("user_id", allAuthorIds);

        // Mapear los datos
        const postsWithData = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(p => p.id === post.author_id),
          role: rolesData?.find(r => r.user_id === post.author_id)?.role,
          comments: commentsData?.filter(c => c.post_id === post.id).map(comment => ({
            ...comment,
            profiles: profilesData?.find(p => p.id === comment.author_id),
            role: rolesData?.find(r => r.user_id === comment.author_id)?.role
          })) || []
        }));

        console.log("Posts with data:", postsWithData);
        setPosts(postsWithData);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        title: "Error",
        description: "Error al cargar las publicaciones",
        variant: "destructive",
      });
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    if (newPostContent.trim().length > 100) {
      toast({
        title: "Error",
        description: "La publicación no puede tener más de 100 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("posts")
        .insert({
          course_id: courseId,
          author_id: user.id,
          title: null,
          content: newPostContent.trim(),
        });

      if (error) throw error;

      toast({
        title: "Publicación creada",
        description: "La publicación se ha creado exitosamente",
      });

      setNewPostContent("");
      setShowNewPost(false);
      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear la publicación",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          author_id: user.id,
          content,
        });

      if (error) throw error;

      setCommentInputs({ ...commentInputs, [postId]: "" });
      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Publicación eliminada",
        description: "La publicación se ha eliminado exitosamente",
      });

      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comentario eliminado",
        description: "El comentario se ha eliminado exitosamente",
      });

      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el comentario",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {(userRole === "teacher" || userRole === "administrator") && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nueva Publicación</CardTitle>
              {!showNewPost && (
                <Button onClick={() => setShowNewPost(true)}>
                  Crear Publicación
                </Button>
              )}
            </div>
          </CardHeader>
          {showNewPost && (
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <Textarea
                    placeholder="Escribe tu publicación..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    required
                    rows={3}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {newPostContent.length}/100 caracteres
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Publicar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewPost(false);
                      setNewPostContent("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aún no hay publicaciones en este curso
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Course ID: {courseId}
            </p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{post.profiles?.full_name}</p>
                    {post.role && (
                      <Badge variant={post.role === "teacher" ? "default" : post.role === "administrator" ? "destructive" : "secondary"} className="text-xs">
                        {post.role === "teacher" ? "Profesor" : post.role === "administrator" ? "Administrador" : "Estudiante"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                {(userRole === "teacher" || userRole === "administrator") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{post.content}</p>

              {/* Comments */}
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium">
                  Comentarios ({post.comments?.length || 0})
                </p>

                {post.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="flex-1 bg-muted rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {comment.profiles?.full_name || "Usuario"}
                            </p>
                            {comment.role && (
                              <Badge variant={comment.role === "teacher" ? "default" : comment.role === "administrator" ? "destructive" : "secondary"} className="text-xs">
                                {comment.role === "teacher" ? "Profesor" : comment.role === "administrator" ? "Administrador" : "Estudiante"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {(userRole === "teacher" || userRole === "administrator") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Escribe un comentario..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                    }
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddComment(post.id);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleAddComment(post.id)}
                    disabled={!commentInputs[post.id]?.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default CourseStream;