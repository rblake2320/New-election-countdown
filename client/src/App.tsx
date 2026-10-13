import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModernLayout } from "@/components/modern-layout";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { ServiceStatusBanner } from "@/components/service-status-banner";
import { CompareProvider } from "@/compare/CompareContext";
import { WelcomeModal, useWelcomeModal } from "@/components/welcome-modal";
import Home from "@/pages/home";
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Congress = lazy(() => import("@/pages/congress"));
const CongressAdmin = lazy(() => import("@/pages/congress-admin"));
const CampaignPortal = lazy(() => import("@/pages/campaign-portal"));
const CandidatePortalFixed = lazy(() => import("@/pages/candidate-portal-fixed"));
const MonitoringDashboard = lazy(() => import("@/pages/monitoring-dashboard"));
const ApiStatusPage = lazy(() => import("@/pages/api-status"));
const CivicDashboard = lazy(() => import("@/pages/civic-dashboard"));
const ElectionDetails = lazy(() => import("@/pages/election-details"));
const Midterm2026 = lazy(() => import("@/pages/midterm-2026"));
const ComparePage = lazy(() => import("@/pages/Compare"));
const DataSteward = lazy(() => import("@/pages/DataSteward"));
const AuthPage = lazy(() => import("@/pages/auth"));
const PreferencesPage = lazy(() => import("@/pages/preferences"));
const AdminResultsEntry = lazy(() => import("@/pages/admin-results-entry"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const InvestorDashboard = lazy(() => import("@/pages/investor-dashboard"));
const HappeningNow = lazy(() => import("@/pages/happening-now"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <ModernLayout sidebar={<NavigationSidebar />}>
      <div className="space-y-4">
        <ServiceStatusBanner className="mx-4 mt-4" />
        <div className="px-4">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground" role="status">Loading…</div>}>
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
            <Route path="/civic" component={CivicDashboard} />
            <Route path="/2026" component={Midterm2026} />
            <Route path="/elections/:id" component={ElectionDetails} />
            <Route path="/compare" component={ComparePage} />
            <Route path="/data-steward" component={DataSteward} />
            <Route path="/preferences" component={PreferencesPage} />
            <Route path="/admin/results" component={AdminResultsEntry} />
            <Route path="/admin-settings" component={AdminSettings} />
            <Route path="/investor-dashboard" component={InvestorDashboard} />
            <Route path="/happening-now" component={HappeningNow} />
            <Route component={NotFound} />
          </Switch>
          </Suspense>
        </div>
      </div>
    </ModernLayout>
  );
}

function App() {
  const { isOpen, handleClose } = useWelcomeModal();

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
