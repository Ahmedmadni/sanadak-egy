import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useMyTenants } from "@/lib/use-my-tenants";
import { useSanadak } from "@/lib/sanadak-context";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { RegisterBusiness } from "@/components/business/RegisterBusiness";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "لوحة الأعمال · سندك" },
      { name: "description", content: "لوحة تحكم مستقلة لإدارة نشاطك التجاري على سندك." },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { tenants, loading: tenantsLoading, refresh } = useMyTenants(user?.id);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { redirect: "/business" } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tenants.length > 0 && !activeId) setActiveId(tenants[0].id);
  }, [tenants, activeId]);

  if (loading || tenantsLoading) {
    return <main className="min-h-screen grid place-items-center"><div className="text-sm text-muted-foreground">...</div></main>;
  }
  if (!user) return null;

  if (tenants.length === 0) {
    return <RegisterBusiness onCreated={refresh} />;
  }

  return (
    <BusinessLayout
      userId={user.id}
      tenants={tenants}
      activeId={activeId ?? tenants[0].id}
      onSwitchTenant={setActiveId}
      onRefresh={refresh}
    />
  );
}
