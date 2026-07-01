import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, BellDot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { PanelHeader, EmptyState } from "../ui";
import type { NotificationRow } from "../types";

export function NotificationsPanel({ userId }: { userId: string }) {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<NotificationRow[]>([]);

  const load = async () => {
    const { data } = await supabase.from("notifications" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [userId]);

  const markRead = async (id: string) => {
    await supabase.from("notifications" as any).update({ is_read: true }).eq("id", id);
    load();
  };

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "الإشعارات" : "Notifications"} />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد إشعارات." : "No notifications."} />}
      <div className="grid gap-2">
        {rows.map((n) => (
          <motion.button key={n.id} layout onClick={() => !n.is_read && markRead(n.id)} className={`text-start glass-card rounded-2xl p-4 flex items-start gap-3 ${!n.is_read ? "ring-1 ring-[var(--emerald)]/40" : ""}`}>
            {n.is_read ? <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /> : <BellDot className="h-4 w-4 text-[var(--emerald)] mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{n.title}</div>
              {n.body && <div className={`text-xs text-muted-foreground mt-0.5 ${lang === "ar" ? "font-arabic" : ""}`}>{n.body}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
