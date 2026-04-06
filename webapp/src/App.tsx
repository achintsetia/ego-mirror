import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import VoiceCompanion from "./pages/VoiceCompanion";
import HabitTracker from "./pages/HabitTracker";
import PersonalityEvolution from "./pages/PersonalityEvolution";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";
import AdminModels from "./pages/AdminModels";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HabitTracker />} />
            <Route path="/voice" element={<VoiceCompanion />} />
            <Route path="/personality" element={<PersonalityEvolution />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/models" element={<AdminModels />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
