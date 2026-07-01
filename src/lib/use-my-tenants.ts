import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TenantWithRole } from "@/components/business/types";

export function useMyTenants(userId?: string | null) {
  const [tenants, setTenants] = useState<TenantWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTenants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: members } = await supabase
      .from("tenant_members" as any)
      .select("tenant_id, role")
      .eq("user_id", userId);

    const rows = (members as { tenant_id: string; role: string }[] | null) ?? [];
    if (rows.length === 0) {
      setTenants([]);
      setLoading(false);
      return;
    }

    const { data: tenantRows } = await supabase
      .from("tenants" as any)
      .select("*")
      .in("id", rows.map((r) => r.tenant_id))
      .order("created_at", { ascending: false });

    const merged = ((tenantRows as any[]) ?? []).map((t) => ({
      ...t,
      role: rows.find((r) => r.tenant_id === t.id)?.role ?? "employee",
    })) as TenantWithRole[];

    setTenants(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tenants, loading, refresh };
}
