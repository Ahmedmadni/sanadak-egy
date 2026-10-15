import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Clear customer details belonging to a previous signed-in user. */
function clearPrivateBrowserState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("sanadak_customer");
    const legacy = localStorage.getItem("sanadak");
    if (legacy) {
      const parsed: unknown = JSON.parse(legacy);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const preferences = parsed as Record<string, unknown>;
        delete preferences.customer;
        delete preferences.cart;
        delete preferences.bookings;
        localStorage.setItem("sanadak", JSON.stringify(preferences));
      }
    }
  } catch {
    // Storage could be disabled or contain malformed legacy JSON. Do not
    // prevent sign-out, and still clear the in-memory state.
  }
  window.dispatchEvent(new Event("sanadak:clear-private"));
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let revision = 0;
    let receivedAuthEvent = false;
    const timers = new Set<number>();

    const applySession = (nextSession: Session | null) => {
      const currentRevision = ++revision;
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      // Drop old admin privileges synchronously at every user change.
      setIsAdmin(false);
      setRoleLoading(Boolean(nextUser));
      setLoading(false);
      if (!nextUser) return;

      // Supabase recommends deferring API calls from its auth-state callback.
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!mounted || revision !== currentRevision) return;
        void supabase.from("user_roles")
          .select("role")
          .eq("user_id", nextUser.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data, error }) => {
            // An older user-role response must never restore a previous
            // account's admin state after logout/account switching.
            if (mounted && revision === currentRevision) {
              setIsAdmin(!error && !!data);
              setRoleLoading(false);
            }
          }).catch(() => {
            if (mounted && revision === currentRevision) setRoleLoading(false);
          });
      }, 0);
      timers.add(timer);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      receivedAuthEvent = true;
      applySession(nextSession);
      if (event === "SIGNED_OUT") clearPrivateBrowserState();
    });

    // INITIAL_SESSION may arrive either before or after getSession(). Never
    // let its late initial response undo a more recent auth event.
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!receivedAuthEvent) applySession(data.session);
      else setLoading(false);
    }).catch(() => {
      if (mounted) {
        setRoleLoading(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      revision += 1;
      for (const timer of timers) window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const result = await supabase.auth.signOut();
    if (!result.error) clearPrivateBrowserState();
    return result;
  };

  return { session, user, isAdmin, roleLoading, loading, signOut };
}
