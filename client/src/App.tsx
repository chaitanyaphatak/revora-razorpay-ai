import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import OperationsDashboard from "./pages/OperationsDashboard";
import AIBrief from "./pages/AIBrief";
import MerchantAssistant from "./pages/MerchantAssistant";
import ManualExecutionSimulation from "./pages/ManualExecutionSimulation";
import ControlCenter from "./pages/ControlCenter";
import PaymentDetail from "./pages/PaymentDetail";
import PaymentsExplorer from "./pages/PaymentsExplorer";
import ReceivablesDashboard from "./pages/ReceivablesDashboard";
import InvoiceDetail from "./pages/InvoiceDetail";
import PromiseToPayTracker from "./pages/PromiseToPayTracker";
import SettingsWorkspace from "./pages/SettingsWorkspace";
import WhatIfSimulator from "./pages/WhatIfSimulator";
import AutomationSimulator from "./pages/AutomationSimulator";
import ActivityWorkspace from "./pages/ActivityWorkspace";
import AnalyticsWorkspace from "./pages/AnalyticsWorkspace";
import LandingPage from "./pages/LandingPage";
import CustomerVoiceRecovery from "./pages/CustomerVoiceRecovery";
import { AgentsWorkspace, CustomersWorkspace, RecoveryWorkspace, RiskWorkspace } from "./pages/RevenueWorkspaces";

function WorkspaceLoading() {
  return <div className="mx-auto max-w-[1540px] space-y-5 pb-10" aria-live="polite" aria-label="Loading workspace"><div className="rr-skeleton h-36 rounded-2xl" /><div className="grid gap-4 md:grid-cols-3"><div className="rr-skeleton h-44 rounded-2xl" /><div className="rr-skeleton h-44 rounded-2xl" /><div className="rr-skeleton h-44 rounded-2xl" /></div></div>;
}

function Router() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <Switch>
        {/* Landing Page (Jas Hero) on / and /landing */}
        <Route path={"/"} component={LandingPage} />
        <Route path={"/landing"} component={LandingPage} />

        {/* Customer Voice Recovery Session (standalone clean customer view) */}
        <Route path={"/recover/:sessionId"} component={CustomerVoiceRecovery} />

        {/* Merchant Workspace Routes */}
        <Route>
          <DashboardLayout>
            <Switch>
              <Route path={"/app"} component={OperationsDashboard} />
              <Route path={"/payments"} component={PaymentsExplorer} />
              <Route path={"/payments/:paymentId"} component={PaymentDetail} />
              <Route path={"/simulator"} component={WhatIfSimulator} />
              <Route path={"/manual-simulation"} component={ManualExecutionSimulation} />
              <Route path={"/ai-brief"} component={AIBrief} />
              <Route path={"/assistant"} component={MerchantAssistant} />
              <Route path={"/control-center"} component={ControlCenter} />
              <Route path={"/activity"} component={ActivityWorkspace} />
              <Route path={"/risk"} component={RiskWorkspace} />
              <Route path={"/recovery"} component={RecoveryWorkspace} />
              <Route path={"/customers"} component={CustomersWorkspace} />
              <Route path={"/invoices/promises"} component={PromiseToPayTracker} />
              <Route path={"/invoices/:invoiceId"} component={InvoiceDetail} />
              <Route path={"/invoices"} component={ReceivablesDashboard} />
              <Route path={"/ai-agents"} component={AgentsWorkspace} />
              <Route path={"/automations"} component={AutomationSimulator} />
              <Route path={"/analytics"} component={AnalyticsWorkspace} />
              <Route path={"/settings"} component={SettingsWorkspace} />
              <Route path={"/404"} component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
