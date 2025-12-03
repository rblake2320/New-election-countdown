import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ModernLayout } from "@/components/modern-layout";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { ServiceStatusBanner } from "@/components/service-status-banner";
import { CompareProvider } from "@/compare/CompareContext";
import { WelcomeModal, useWelcomeModal } from "@/components/welcome-modal";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Congress from "@/pages/congress";
import CongressAdmin from "@/pages/congress-admin";
import CampaignPortal from "@/pages/campaign-portal";
import CandidatePortalFixed from "@/pages/candidate-portal-fixed";
import MonitoringDashboard from "@/pages/monitoring-dashboard";
import ApiStatusPage from "@/pages/api-status";
import GlobalDashboard from "@/pages/global-dashboard";
import CivicDashboard from "@/pages/civic-dashboard";
import ElectionDetails from "@/pages/election-details";
import Midterm2026 from "@/pages/midterm-2026";
import ComparePage from "@/pages/Compare";
import DataSteward from "@/pages/DataSteward";
import AuthPage from "@/pages/auth";
import PreferencesPage from "@/pages/preferences";
import AdminResultsEntry from "@/pages/admin-results-entry";
import HappeningNow from "@/pages/happening-now";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <ModernLayout sidebar={<NavigationSidebar />}>
      <div className="space-y-4">
        <ServiceStatusBanner className="mx-4 mt-4" />
        <div className="px-4">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/congress" component={Congress} />
            <Route path="/congress-admin" component={CongressAdmin} />
            <Route path="/campaign-portal" component={CampaignPortal} />
            <Route path="/candidate-portal" component={CandidatePortalFixed} />
            <Route path="/monitoring" component={MonitoringDashboard} />
            <Route path="/api-status" component={ApiStatusPage} />
            <Route path="/global" component={GlobalDashboard} />
            <Route path="/civic" component={CivicDashboard} />
            <Route path="/2026" component={Midterm2026} />
            <Route path="/elections/:id" component={ElectionDetails} />
            <Route path="/compare" component={ComparePage} />
            <Route path="/data-steward" component={DataSteward} />
            <Route path="/preferences" component={PreferencesPage} />
            <Route path="/admin/results" component={AdminResultsEntry} />
            <Route path="/happening-now" component={HappeningNow} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </ModernLayout>
  );
}

function App() {
  const { isOpen, handleClose } = useWelcomeModal();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CompareProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-app-bg text-app-fg font-sans antialiased">
              <Toaster />
              <Router />
              <WelcomeModal open={isOpen} onOpenChange={handleClose} />
            </div>
          </TooltipProvider>
        </CompareProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
