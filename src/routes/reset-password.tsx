import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Lock, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import {
  isRecoveryCallbackUrl,
  isSameRecoveryUser,
  isVerifiedRecoveryAuthEvent,
  validateNewPassword,
} from "@/lib/password-recovery";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "تعيين كلمة مرور جديدة | سندك" }] }),
  component: ResetPasswordPage,
});

type RecoveryState = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const { lang } = useSanadak();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const [flow, setFlow] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const verifiedRecoveryUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const callbackHint = isRecoveryCallbackUrl(window.location.search, window.location.hash);
    const query = new URLSearchParams(window.location.search);
    const tokenHash = query.get("type") === "recovery" ? query.get("token_hash") : null;
    const tokenHashFlow = Boolean(tokenHash);

    // IMPORTANT: A SIGNED_IN or INITIAL_SESSION event with an arbitrary URL
    // query string is not proof that a recovery token was validated. Prior
    // implementations could unlock this form using a pre-existing session.
    const trustVerifiedUser = (userId: string) => {
      if (!active) return;
      verifiedRecoveryUserId.current = userId;
      setFlow("ready");
      // Remove recovery credentials from history as soon as verified.
      window.history.replaceState(window.history.state, "", window.location.pathname);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (isVerifiedRecoveryAuthEvent(event, callbackHint, session?.user.id)) {
        trustVerifiedUser(session!.user.id);
      } else if (event === "SIGNED_OUT") {
        verifiedRecoveryUserId.current = null;
        setFlow((current) => current === "done" ? current : "invalid");
      } else if (
        verifiedRecoveryUserId.current &&
        session?.user.id &&
        !isSameRecoveryUser(verifiedRecoveryUserId.current, session.user.id)
      ) {
        // Do not allow switching accounts mid-reset.
        verifiedRecoveryUserId.current = null;
        setFlow("invalid");
      }
    });

    if (tokenHashFlow) {
      // For customized email templates, verify token_hash through Supabase.
      // A previously signed-in user cannot authorize this path by themselves.
      void (async () => {
        try {
          if (!tokenHash || tokenHash.length > 4096) throw new Error("Invalid recovery token");
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (!active) return;
          if (verifyError || !data.session?.user) throw new Error("Invalid recovery token");
          trustVerifiedUser(data.session.user.id);
        } catch {
          if (active) {
            verifiedRecoveryUserId.current = null;
            setFlow("invalid");
          }
        } finally {
          // Do not retain single-use recovery tokens in browser history.
          if (active) window.history.replaceState(window.history.state, "", window.location.pathname);
        }
      })();
    } else if (!callbackHint) {
      // Visiting the reset URL directly must never expose the update form.
      setFlow("invalid");
    } else {
      // Standard Supabase recovery redirects emit PASSWORD_RECOVERY after
      // parsing an implicit or PKCE callback. Do NOT use getSession here:
      // an unrelated pre-existing login session is not authorization.
      const timeout = window.setTimeout(() => {
        if (active && !verifiedRecoveryUserId.current) setFlow("invalid");
      }, 8000);
      return () => {
        active = false;
        window.clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (flow !== "ready" || saving || !verifiedRecoveryUserId.current) return;
    const problem = validateNewPassword(password, confirmation);
    if (problem) {
      setError(problem === "length"
        ? (ar ? "كلمة المرور يجب أن تكون من 12 إلى 72 حرفًا." : "Use a password between 12 and 72 characters.")
        : (ar ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Supabase must have already verified the recovery link and session.
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !isSameRecoveryUser(verifiedRecoveryUserId.current, auth.user?.id)) {
        throw new Error("Verified recovery session is unavailable or changed");
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmation("");
      verifiedRecoveryUserId.current = null;
      setFlow("done");
      // End the recovery session so a password reset is followed by a normal login.
      await supabase.auth.signOut();
    } catch {
      setError(ar
        ? "تعذر تغيير كلمة المرور. قد يكون الرابط منتهي الصلاحية؛ اطلب رابطًا جديدًا."
        : "Could not update your password. The link may have expired; please request another one.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
      <section className="glass-card relative w-full max-w-md rounded-3xl p-6 shadow-float sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--emerald)]/10 text-[var(--emerald)]">
          {flow === "done"
            ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            : <KeyRound className="h-6 w-6" aria-hidden="true" />}
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {flow === "done"
            ? (ar ? "تم تحديث كلمة المرور" : "Password updated")
            : (ar ? "تعيين كلمة مرور جديدة" : "Set a new password")}
        </h1>
        {flow === "checking" && (
          <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {ar ? "جارٍ التحقق من رابط الاستعادة…" : "Validating your recovery link…"}
          </p>
        )}
        {flow === "invalid" && (
          <div role="alert" className="mt-5 space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">
              {ar
                ? "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من بريدك الإلكتروني."
                : "This recovery link is invalid or has expired. Request a new link by email."}
            </p>
            <Link to="/forgot-password" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold">
              {ar ? "طلب رابط جديد" : "Request another link"}
            </Link>
          </div>
        )}
        {flow === "done" && (
          <div role="status" className="mt-5 space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">
              {ar
                ? "تم حفظ كلمة المرور الجديدة. سجّل الدخول بها لمتابعة استخدام سندك."
                : "Your new password has been saved. Sign in again to continue using Sanadak."}
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/auth" })}
              className="inline-flex min-h-11 items-center rounded-full bg-gradient-brand px-5 font-semibold text-primary-foreground"
            >
              {ar ? "تسجيل الدخول" : "Sign in"}
            </button>
          </div>
        )}
        {flow === "ready" && (
          <form onSubmit={(event) => void savePassword(event)} className="mt-5 space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {ar
                ? "استخدم كلمة مرور جديدة من 12 إلى 72 حرفًا، واحتفظ بها في مكان آمن."
                : "Use a new password between 12 and 72 characters and store it securely."}
            </p>
            <label htmlFor="new-password" className="block text-sm font-semibold">
              {ar ? "كلمة المرور الجديدة" : "New password"}
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background px-4"
            />
            <label htmlFor="confirm-password" className="block text-sm font-semibold">
              {ar ? "تأكيد كلمة المرور" : "Confirm password"}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background px-4"
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {saving
                ? (ar ? "جارٍ حفظ كلمة المرور…" : "Saving…")
                : (ar ? "حفظ كلمة المرور" : "Save password")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
