import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { NotificationsPanel } from "@/components/business/panels/NotificationsPanel";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "الإشعارات | سندك" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { redirect: "/notifications" } });
    }
  }, [loading, navigate, user]);

  if (loading || !user) return <main className="min-h-screen" />;

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <NotificationsPanel userId={user.id} />
      </div>
    </main>
  );
}
