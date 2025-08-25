import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ContractorAuth from "./pages/ContractorAuth";
import AdminAuth from "./pages/AdminAuth";
import AdminDashboard from "./pages/AdminDashboard";
import ContractorManagement from "./pages/ContractorManagement";
import JobManagement from "./pages/JobManagement";
import PaymentManagement from "./pages/PaymentManagement";
import BookingFlow from "./pages/BookingFlow";
import BookingSuccess from "./pages/BookingSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/contractor" element={<ContractorAuth />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/contractors" element={<ContractorManagement />} />
          <Route path="/admin/jobs" element={<JobManagement />} />
          <Route path="/admin/payments" element={<PaymentManagement />} />
          <Route path="/book" element={<BookingFlow />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
