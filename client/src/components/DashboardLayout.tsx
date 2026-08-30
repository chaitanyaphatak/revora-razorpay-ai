import {
  Activity, BarChart3, Bell, Bot, Building2, CalendarClock, ChevronDown, CircleDollarSign, FileText, Gauge, LayoutDashboard, MessageSquareText, PlayCircle,
  PanelLeft, Settings2, ShieldAlert, Users, Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { GlobalCommandPalette } from "@/components/recoverai/GlobalCommandPalette";
import { trpc } from "@/lib/trpc";

type NavItem = { icon: typeof LayoutDashboard; label: string; path: string; tag?: string };

const sections: Array<{ label: string; items: NavItem[] }> = [
  { label: "Workspace", items: [
    { icon: LayoutDashboard, label: "Overview", path: "/" },
    { icon: ShieldAlert, label: "Revenue risk", path: "/risk" },
    { icon: Gauge, label: "Recovery", path: "/recovery" },
    { icon: PlayCircle, label: "Manual simulation", path: "/manual-simulation", tag: "Safe" },
  ] },
  { label: "Revenue operations", items: [
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: CircleDollarSign, label: "Payments", path: "/payments" },
    { icon: FileText, label: "Invoices", path: "/invoices", tag: "B2B" },
    { icon: CalendarClock, label: "Promises", path: "/invoices/promises" },
  ] },
  { label: "Intelligence", items: [
    { icon: MessageSquareText, label: "Assistant", path: "/assistant", tag: "Gemini" },
    { icon: Bot, label: "AI agents", path: "/ai-agents" },
    { icon: Workflow, label: "Automations", path: "/automations" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", tag: "New" },
    { icon: Activity, label: "Activity", path: "/activity" },
  ] },
];

const titleFor = (path: string) => sections.flatMap(section => section.items).find(item => item.path === path)?.label ?? (path.startsWith("/payments/") ? "Payment detail" : path.startsWith("/invoices/") ? "Invoice detail" : path === "/settings" ? "Settings" : "Overview");

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider style={{ "--sidebar-width": "258px" } as React.CSSProperties}>
    <DashboardLayoutContent>{children}</DashboardLayoutContent>
    <GlobalCommandPalette />
  </SidebarProvider>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const utils = trpc.useUtils();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [manualSimulationNotice, setManualSimulationNotice] = useState<{ paymentId: string; action: string; status: string; timestamp: string } | null>(null);
  const [hasUnreadManualSimulation, setHasUnreadManualSimulation] = useState(false);
  const pageTitle = titleFor(location);

  useEffect(() => {
    void utils.recovery.dashboard.prefetch({ range: "30D" });
    void utils.recovery.payments.prefetch({ page: 1, pageSize: 50, status: "FAILED", sort: "probability_desc" });
    void utils.recovery.operationsCenter.prefetch();
    void utils.invoices.dashboard.prefetch();
    void utils.invoices.list.prefetch({ page: 1, pageSize: 50 });
  }, [utils]);

  useEffect(() => {
    const onManualSimulationRecorded = (event: Event) => {
      const detail = (event as CustomEvent<{ paymentId?: string; action?: string; status?: string; timestamp?: string }>).detail;
      if (!detail?.paymentId || !detail.timestamp) return;
      setManualSimulationNotice({ paymentId: detail.paymentId, action: detail.action ?? "manual simulation", status: detail.status ?? "recorded", timestamp: detail.timestamp });
      setHasUnreadManualSimulation(true);
      window.setTimeout(() => setHasUnreadManualSimulation(false), 6_000);
    };
    window.addEventListener("revora:manual-simulation-recorded", onManualSimulationRecorded);
    return () => window.removeEventListener("revora:manual-simulation-recorded", onManualSimulationRecorded);
  }, []);

  return <>
    <Sidebar collapsible="icon" className="rr-sidebar border-r border-slate-200/90 bg-white">
      <SidebarHeader className="border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <button onClick={toggleSidebar} className="rr-icon-button rr-sidebar-toggle shrink-0" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setLocation("/")} className="rr-brand min-w-0 overflow-hidden group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0" aria-label="ReVora home">
            <span className="rr-brand-mark" aria-hidden="true"><span>R</span></span>
            <span className="rr-brand-copy">
              <span className="rr-brand-name">Re<span>Vora</span></span>
              <span className="rr-brand-tag">Revenue operations</span>
            </span>
          </button>
        </div>
        <button onClick={() => setLocation("/settings")} className="rr-workspace-switch mt-3 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:border-slate-300 hover:bg-white group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:max-h-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:opacity-0"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white"><Building2 className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">Acme Inc.</span><span className="block truncate text-[10px] text-slate-500">Business workspace</span></span><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></button>
      </SidebarHeader>
      <SidebarContent className="rr-scrollbar px-2 py-1">
        {sections.map(section => <div key={section.label} className="mb-1.5"><p className="rr-nav-label group-data-[collapsible=icon]:hidden">{section.label}</p><SidebarMenu>
          {section.items.map(item => {
            const directOrNestedMatch = item.path === "/" ? location === "/" : location === item.path || location.startsWith(`${item.path}/`);
            const hasMoreSpecificMatch = sections.flatMap(candidateSection => candidateSection.items).some(candidate => candidate.path !== item.path && candidate.path.startsWith(`${item.path}/`) && (location === candidate.path || location.startsWith(`${candidate.path}/`)));
            const active = directOrNestedMatch && !hasMoreSpecificMatch;
            return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={active} onClick={() => setLocation(item.path)} tooltip={item.label} className="rr-nav-item"><item.icon className="h-4 w-4" /><span>{item.label}</span>{item.tag ? <span className="ml-auto rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600 group-data-[collapsible=icon]:hidden">{item.tag}</span> : null}</SidebarMenuButton></SidebarMenuItem>;
          })}
        </SidebarMenu></div>)}
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-100 p-2"><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={() => setLocation("/settings")} tooltip="Settings" className="rr-nav-item"><Settings2 className="h-4 w-4" /><span>Settings</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset className="bg-[#f7f8fa] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] [transform:translateZ(0)]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl sm:px-6 [transform:translateZ(0)]">
        <div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="rr-icon-button md:hidden" />{isMobile ? null : <><span className="text-xs font-medium text-slate-400">Revenue Recovery</span><span className="text-xs text-slate-300">/</span></>}<span className="truncate text-sm font-semibold text-slate-800">{pageTitle}</span></div>
        <div className="flex items-center gap-2"><button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} className="rr-search-trigger hidden min-w-72 items-center gap-2 sm:flex"><span className="text-slate-400">Search customers, payments, invoices...</span><kbd>⌘ K</kbd></button><button className={`rr-icon-button relative ${hasUnreadManualSimulation ? "rr-notification-bell" : ""}`} onClick={() => { setNotificationsOpen(value => !value); setHasUnreadManualSimulation(false); }} aria-label={hasUnreadManualSimulation ? "New manual simulation notification" : "Notifications"}><Bell className="h-4 w-4" />{hasUnreadManualSimulation ? <span className="rr-notification-dot absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}</button></div>
        {notificationsOpen ? <div className="rr-floating-surface absolute right-4 top-14 w-72 rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-extrabold text-slate-800">Notifications</p>{manualSimulationNotice ? <button type="button" onClick={() => { setNotificationsOpen(false); setLocation("/activity"); }} className="mt-2 w-full rounded-lg border border-violet-100 bg-violet-50 p-2.5 text-left text-xs leading-5 text-violet-900 transition-colors hover:bg-violet-100"><span className="block font-bold">Manual simulation recorded</span><span className="mt-0.5 block font-mono text-[10px] text-violet-700">{manualSimulationNotice.paymentId} · {manualSimulationNotice.status}</span><span className="mt-1 block text-[10px] text-violet-700">View timestamped audit evidence in Activity</span></button> : <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-5 text-slate-500">Recovery monitoring is using synthetic payment events.</p>}</div> : null}
      </header>
      <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main>
    </SidebarInset>
  </>;
}
