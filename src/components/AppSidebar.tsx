import { Home, User, BookOpen, MessageSquare, Video, FileText, Library, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Mi Información", url: "/profile", icon: User },
  { title: "Cursos", url: "/dashboard", icon: BookOpen },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Clases Virtuales", url: "/virtual-classes", icon: Video },
  { title: "Evaluaciones", url: "/evaluations", icon: FileText },
  { title: "Biblioteca", url: "/library", icon: Library },
  { title: "Foros", url: "/forums", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);

  const isCollapsed = state === "collapsed";

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (roleData) {
      setUserRole(roleData.role);
      
      if (roleData.role === "administrator") {
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, title, code")
          .order("created_at", { ascending: false });
        
        if (coursesData) {
          setCourses(coursesData);
        }
      }
    }
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === "administrator" && courses.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              Mis Cursos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {courses.map((course) => (
                  <SidebarMenuItem key={course.id}>
                    <SidebarMenuButton
                      onClick={() => navigate(`/courses/${course.id}?tab=people`)}
                      isActive={location.pathname.includes(`/courses/${course.id}`)}
                      className="cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4" />
                      {!isCollapsed && <span className="truncate">{course.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
