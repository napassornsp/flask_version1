import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export default function Notifications() {
  const canonical = typeof window !== "undefined" ? window.location.origin + "/notifications" : "";
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NotificationRow | null>(null);
  const unread = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setRows([]); setLoading(false); return; }
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read_at, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const openAndMarkRead = async (row: NotificationRow) => {
    setActive(row);
    setOpen(true);
    if (!row.read_at) {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", row.id).eq("user_id", uid);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)));
    }
  };

  return (
    <main className="container py-8 min-h-svh">
      <Helmet>
        <title>{`Notifications (${unread}) | Company`}</title>
        <meta name="description" content="View your latest notifications and updates." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          Notifications {unread > 0 && (<Badge className="ml-1">{unread} unread</Badge>)}
        </h1>
      </header>

      <section className="grid gap-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          rows.map((n) => (
            <Card key={n.id} className={!n.read_at ? "border-primary/40" : undefined}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {n.title} {!n.read_at && <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => openAndMarkRead(n)}>
                  Read
                </Button>
              </CardHeader>
              {/* Only show topic in the list; details are shown in dialog */}
            </Card>
          ))
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {active?.body || "No details"}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
