import { useMemo, useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
  SidebarFooter, SidebarMenuAction, useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Plus, MessageSquare, FileText, Eye, User, PanelLeft, PanelLeftOpen,
  HelpCircle, Bell, Home, LogIn, LogOut, CheckCircle2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import service from "@/services/backend";
import type { Chat } from "@/services/types";
import useAuthSession from "@/hooks/useAuthSession";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

interface AppSidebarProps {
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  loggedIn?: boolean;
}

export function AppSidebar({
  chats, activeId, onSelect, onNewChat, onRename, onDelete, loggedIn,
}: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  useAuthSession(); // ensure auth state sync
  const location = useLocation();
  const isOcr = location.pathname.startsWith("/ocr");

  type OcrItem = {
    id: string;
    type: "bill" | "bank";
    filename: string | null;
    created_at: string;
    approved?: boolean;
    file_url?: string | null;
  };
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([]);

  const loadOcr = async () => {
    try {
      const [{ data: bills }, { data: banks }] = await Promise.all([
        supabase
          .from("ocr_bill_extractions")
          .select("id, filename, created_at, approved, file_url")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("ocr_bank_extractions")
          .select("id, filename, created_at, approved, file_url")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const billItems = (bills ?? []).map((b: any) => ({
        id: b.id, type: "bill" as const, filename: b.filename ?? null,
        created_at: b.created_at, approved: !!b.approved, file_url: b.file_url ?? null,
      }));
      const bankItems = (banks ?? []).map((b: any) => ({
        id: b.id, type: "bank" as const, filename: b.filename ?? null,
        created_at: b.created_at, approved: !!b.approved, file_url: b.file_url ?? null,
      }));

      const combined = [...billItems, ...bankItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      setOcrItems(combined);
    } catch (err) {
      console.error("Failed to load OCR items:", err);
      setOcrItems([]);
    }
  };

  useEffect(() => {
    loadOcr();
    const listener = () => loadOcr();
    window.addEventListener("ocr:refresh", listener as any);
    return () => window.removeEventListener("ocr:refresh", listener as any);
  }, []);

  const groups = useMemo(() => {
    const now = new Date();
    const getAgeDays = (iso: string) => {
      const d = new Date(iso);
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    };
    const recent: Chat[] = [];
    const last7: Chat[] = [];
    const last30: Chat[] = [];
    const older: Chat[] = [];
    for (const c of chats) {
      const days = getAgeDays(c.created_at);
      if (days <= 1) recent.push(c);
      else if (days <= 7) last7.push(c);
      else if (days <= 30) last30.push(c);
      else older.push(c);
    }
    return { recent, last7, last30, older };
  }, [chats]);

  return (
    <Sidebar collapsible="icon" className="h-screen overflow-hidden z-[3]">
      <SidebarContent className="overflow-hidden">
        <SidebarHeader>
          <div className="flex items-center justify-between px-2 py-2">
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Company</span>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                <MessageSquare className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Expand sidebar" onClick={toggleSidebar}>
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Collapse sidebar" onClick={toggleSidebar}>
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Collapse</TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarHeader>

        {/* Modules */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Modules</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => (window.location.href = "/")} className="overflow-hidden" tooltip={{ children: "Chatbot", hidden: false }}>
                  <MessageSquare />
                  {!collapsed && <span>Chatbot</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => (window.location.href = "/ocr/bill")} className="overflow-hidden" tooltip={{ children: "OCR", hidden: false }}>
                  <FileText />
                  {!collapsed && <span>OCR</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => (window.location.href = "/vision/flower")} className="overflow-hidden" tooltip={{ children: "Vision AI", hidden: false }}>
                  <Eye />
                  {!collapsed && <span>Vision AI</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => (window.location.href = "/notifications")} className="overflow-hidden" tooltip={{ children: "Notifications", hidden: false }}>
                  <div className="relative">
                    <Bell />
                    <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-[2px] leading-none">3</span>
                  </div>
                  {!collapsed && <span>Notifications</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Chat / Image */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => (isOcr ? window.dispatchEvent(new CustomEvent("ocr:new")) : onNewChat())}
                  tooltip={{ children: isOcr ? "New Image" : "New Chat", hidden: false }}
                  className="overflow-hidden bg-gradient-to-r from-primary to-accent text-primary-foreground hover:brightness-110"
                >
                  <Plus />
                  {!collapsed && <span className="font-medium">{isOcr ? "New Image" : "New Chat"}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* OCR history */}
        {isOcr && !collapsed && (
          <SidebarGroup className="min-h-0 flex-1 overflow-hidden">
            <SidebarGroupLabel>OCR History</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="min-h-0 max-h-full overflow-y-auto pr-1">
                <SidebarMenu>
                  {ocrItems.length === 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled className="opacity-60">No history</SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    ocrItems.map((item) => (
                      <SidebarMenuItem key={`${item.type}-${item.id}`}>
                        <SidebarMenuButton
                          className="overflow-hidden"
                          onClick={() => (window.location.href = `/ocr/${item.type}/${item.id}`)}
                          tooltip={{ children: item.filename || (item.type === "bill" ? "Bill" : "Bank"), hidden: false }}
                        >
                          <FileText />
                          <span className="truncate flex-1">{item.filename || (item.type === "bill" ? "Bill" : "Bank")}</span>
                          {item.approved && <CheckCircle2 className="ml-1 h-4 w-4 text-green-600 dark:text-green-400" aria-label="Approved" />}
                          <Badge variant="outline" className="ml-auto capitalize">{item.type}</Badge>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Chat history groups */}
        {!collapsed && !isOcr && (
          <SidebarGroup className="min-h-0 flex-1 overflow-hidden">
            <SidebarGroupLabel>History</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="min-h-0 max-h-full overflow-y-auto pr-1">
                {(["recent","last7","last30","older"] as const).map((k) => {
                  const labels: Record<typeof k, string> = {
                    recent: "Recently",
                    last7: "Last 7 Days",
                    last30: "Last 30 Days",
                    older: "Older",
                  } as any;
                  const section = (groups as any)[k] as Chat[];
                  if (!section?.length) return null;
                  return (
                    <div className="mb-2" key={k}>
                      <div className="px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">{labels[k]}</div>
                      <SidebarMenu>
                        {section.map((chat) => (
                          <SidebarMenuItem key={chat.id}>
                            <SidebarMenuButton
                              isActive={activeId === chat.id}
                              onClick={() => onSelect(chat.id)}
                              className="overflow-hidden"
                              tooltip={{ children: chat.title, hidden: false }}
                            >
                              <MessageSquare />
                              <span className="truncate">{chat.title}</span>
                            </SidebarMenuButton>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction aria-label="Chat actions">…</SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-50">
                                <DropdownMenuItem onClick={() => { const name = window.prompt("Rename chat", chat.title); if (name) onRename(chat.id, name); }}>Rename</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(chat.id)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </div>
                  );
                })}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Footer / Profile */}
        <SidebarFooter className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton className={`overflow-hidden ${collapsed ? "w-full justify-center mx-auto" : ""}`} tooltip={{ children: "Profile", hidden: false }}>
                        <div className="relative">
                          <User />
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" aria-hidden></span>
                        </div>
                        {!collapsed && <span>Profile</span>}
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="p-1 w-56">
                      <div className="flex flex-col">
                        <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted" onClick={() => (window.location.href = "/")}><Home className="h-4 w-4" /> Home</button>
                        <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted" onClick={() => (window.location.href = "/profile")}><User className="h-4 w-4" /> User Profile</button>
                        <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted" onClick={() => (window.location.href = "/notifications")}><Bell className="h-4 w-4" /> Notifications <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1">3</span></button>
                        <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted" onClick={() => (window.location.href = "/help")}><HelpCircle className="h-4 w-4" /> Help</button>
                        <div className="my-1 border-t" />
                        {loggedIn ? (
                          <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted" onClick={async () => { try { await service.signOut(); } finally { window.location.href = "/auth"; } }}>
                            <LogOut className="h-4 w-4" /> Logout
                          </button>
                        ) : (
                          <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted" onClick={() => (window.location.href = "/auth")}>
                            <LogIn className="h-4 w-4" /> Login
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
