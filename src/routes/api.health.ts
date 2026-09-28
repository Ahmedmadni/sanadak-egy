import { createFileRoute } from "@tanstack/react-router";

function hasPublicSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  return Boolean(url && key);
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const ready = hasPublicSupabaseConfig();

        return Response.json(
          {
            status: ready ? "ok" : "not_ready",
            service: "sanadak",
          },
          {
            status: ready ? 200 : 503,
            headers: {
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
