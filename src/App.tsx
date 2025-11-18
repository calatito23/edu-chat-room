import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateCourse from "./pages/CreateCourse";
import JoinCourse from "./pages/JoinCourse";
import CourseView from "./pages/CourseView";
import Chat from "./pages/Chat";
import EvaluationStats from "./pages/EvaluationStats";
import Profile from "./pages/Profile";
import VirtualClasses from "./pages/VirtualClasses";
import Evaluations from "./pages/Evaluations";
import Library from "./pages/Library";
import Forums from "./pages/Forums";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
          <Route path="/chat" element={<DashboardLayout><Chat /></DashboardLayout>} />
          <Route path="/virtual-classes" element={<DashboardLayout><VirtualClasses /></DashboardLayout>} />
          <Route path="/evaluations" element={<DashboardLayout><Evaluations /></DashboardLayout>} />
          <Route path="/library" element={<DashboardLayout><Library /></DashboardLayout>} />
          <Route path="/forums" element={<DashboardLayout><Forums /></DashboardLayout>} />
          <Route path="/courses/create" element={<DashboardLayout><CreateCourse /></DashboardLayout>} />
          <Route path="/courses/join" element={<DashboardLayout><JoinCourse /></DashboardLayout>} />
          <Route path="/courses/:courseId" element={<DashboardLayout><CourseView /></DashboardLayout>} />
          <Route path="/courses/:courseId/evaluations/:evaluationId/stats" element={<DashboardLayout><EvaluationStats /></DashboardLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
