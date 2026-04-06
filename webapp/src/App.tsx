import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ConversationGate } from "@/components/ConversationGate";
import { AdminGate } from "@/components/AdminGate";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import VoiceCompanion from "./pages/VoiceCompanion";
import HabitTracker from "./pages/HabitTracker";
import PersonalityEvolution from "./pages/PersonalityEvolution";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";
import AdminModels from "./pages/AdminModels";
import TodoList from "./pages/TodoList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/voice" element={<VoiceCompanion />} />
        <Route path="/todos" element={<TodoList />} />
        <Route path="/habits" element={<ConversationGate><HabitTracker /></ConversationGate>} />
        <Route path="/personality" element={<ConversationGate><PersonalityEvolution /></ConversationGate>} />
        <Route path="/reports" element={<ConversationGate><Reports /></ConversationGate>} />
        <Route path="/admin/users" element={<AdminGate><AdminUsers /></AdminGate>} />
        <Route path="/admin/models" element={<AdminGate><AdminModels /></AdminGate>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
