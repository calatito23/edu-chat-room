import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, User } from "lucide-react";

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
  userRole: "student" | "teacher";
}

const CourseStream = ({ courseId, userRole }: CourseStreamProps) => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [showNewPost, setShowNewPost] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [courseId]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:author_id(full_name, avatar_url),
          comments(
            *,
            profiles:author_id(full_name, avatar_url)
          )
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("posts")
        .insert({
          course_id: courseId,
          author_id: user.id,
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
        });

      if (error) throw error;

      toast({
        title: "Publicación creada",
        description: "La publicación se ha creado exitosamente",
      });

      setNewPostTitle("");
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

  return (
    <div className="space-y-6">
      {userRole === "teacher" && (
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
                <Input
                  placeholder="Título de la publicación"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="Contenido de la publicación..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  required
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Publicar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewPost(false);
                      setNewPostTitle("");
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
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {post.profiles?.full_name} •{" "}
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>

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
                      <p className="text-sm font-medium">
                        {comment.profiles?.full_name}
                      </p>
                      <p className="text-sm mt-1">{comment.content}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
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