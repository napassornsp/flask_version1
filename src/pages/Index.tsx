import { useEffect, useMemo, useRef, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import ChatInput from "@/components/chat/ChatInput";
import TypingBubble from "@/components/chat/TypingBubble";
import { useToast } from "@/hooks/use-toast";
import useAuthSession from "@/hooks/useAuthSession";
import service from "@/services/backend";
import type { BotVersion, Chat, Credits, Message } from "@/services/types";

const Index = () => {
  const { user, loading } = useAuthSession();
  const { toast } = useToast();

  const [version, setVersion] = useState<BotVersion>("V2");
  const [credits, setCredits] = useState<Credits | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [showTyping, setShowTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // SEO tags
  useEffect(() => {
    document.title = "AI Chat – Multi-Version Assistant";
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    setMeta("description", "AI chat app with V1/V2/V3 model versions, credits, and history.");
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.href;
  }, []);

  // Redirect to /auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/auth";
    }
  }, [loading, user]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [creditsRes, chatsRes] = await Promise.all([
          service.getCredits(),
          service.listChats(1000, 0),
        ]);
        setCredits(creditsRes);
        setChats(chatsRes);
        if (chatsRes.length === 0) {
          const created = await service.createChat("New Chat");
          setChats([created]);
          setActiveId(created.id);
        } else {
          setActiveId(chatsRes[0].id);
        }
      } catch (e: any) {
        toast({ title: "Load error", description: e.message ?? String(e) });
      }
    })();
  }, [user]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const msgs = await service.listMessages(activeId, 200, 0);
        setMessages(msgs);
        setTimeout(scrollToBottom, 0);
      } catch (e: any) {
        toast({ title: "Messages error", description: e.message ?? String(e) });
      }
    })();
  }, [activeId]);

  const onNewChat = async () => {
    try {
      const chat = await service.createChat("New Chat");
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
      setMessages([]);
    } catch (e: any) {
      toast({ title: "Could not create chat", description: e.message ?? String(e) });
    }
  };

  const onRename = async (id: string, title: string) => {
    try {
      await service.renameChat(id, title);
      setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (e: any) {
      toast({ title: "Rename failed", description: e.message ?? String(e) });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await service.deleteChat(id);
      setChats((cs) => cs.filter((c) => c.id !== id));
      if (activeId === id) {
        const next = chats.find((c) => c.id !== id);
        if (next) setActiveId(next.id);
        else await onNewChat();
      }
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message ?? String(e) });
    }
  };

  const send = async (text: string) => {
    if (!activeId || sending) return;
    setSending(true);
    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      chat_id: activeId,
      user_id: user!.id,
      role: "user",
      content: { text, version, meta: {} },
      created_at: new Date().toISOString(),
    } as any;
    setMessages((m) => [...m, userMsg]);
    setShowTyping(true);

    try {
      const { assistant, credits: newCredits } = await service.sendMessage({ chatId: activeId, version, text });
      setCredits(newCredits);
      setShowTyping(false);
      setMessages((m) => [...m, assistant]);
      setTimeout(scrollToBottom, 50);
    } catch (e: any) {
      setShowTyping(false);
      setMessages((m) => m.filter((mm) => mm.id !== userMsg.id));
      toast({ title: "Send failed", description: e.message ?? String(e) });
    } finally {
      setSending(false);
    }
  };

  const regenerate = async (lastUserText: string) => {
    if (!activeId || sending) return;
    setSending(true);
    setShowTyping(true);
    try {
      const { assistant, credits: newCredits } = await service.regenerate({ chatId: activeId, version, lastUserText });
      setCredits(newCredits);
      setShowTyping(false);
      setMessages((m) => [...m, assistant]);
      setTimeout(scrollToBottom, 50);
    } catch (e: any) {
      setShowTyping(false);
      toast({ title: "Regenerate failed", description: e.message ?? String(e) });
    } finally {
      setSending(false);
    }
  };

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Copy failed" });
    }
  };

  return (
    <SidebarProvider>
      <div className="h-svh grid grid-cols-[auto_1fr] w-full overflow-x-hidden">
        <AppSidebar
          chats={chats}
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          onNewChat={onNewChat}
          onRename={onRename}
          onDelete={onDelete}
          loggedIn={!!user}
        />

        <SidebarInset>
          <main className="flex-1 min-w-0 min-h-0 grid grid-rows-[auto_1fr_auto] h-svh overflow-hidden overflow-x-hidden">
            <ChatHeader version={version} credits={credits} onVersionChange={setVersion} />
            <section className="min-w-0 min-h-0 overflow-y-auto p-4 space-y-4 break-words" aria-live="polite">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground mt-10">Start your first conversation…</div>
              )}
              {messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} onCopy={onCopy} onRegenerate={(t) => regenerate(t)} />
              ))}
              {showTyping && <TypingBubble />}
              <div ref={messagesEndRef} />
            </section>
            <div className="sticky bottom-0 z-20 bg-background border-t"><ChatInput disabled={sending} onSend={send} /></div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
