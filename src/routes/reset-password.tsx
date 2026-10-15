import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Lock, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { isRecoveryCallbackUrl, validateNewPassword } from "@/lib/password-recovery";

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

  useEffect(() => {
    let active = true;
    let verifiedRecoveryEvent = false;
    const callbackHint = isRecoveryCallbackUrl(window.location.search, window.location.hash);
    let timeout: number | undefined;

    // PASSWORD_RECOVERY is emitted by Supabase after it verifies a recovery
    // link and installs a session. A URL marker alone is never authorization.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        verifiedRecoveryEvent = true;
        setFlow("ready");
      } else if (
        callbackHint &&
        session?.user &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        setFlow("ready");
      } else if (event === "SIGNED_OUT") {
        setFlow((current) => current === "done" ? current : "invalid");
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || verifiedRecoveryEvent) return;
      if (!sessionError && callbackHint && data.session?.user) {
        setFlow("ready");
      } else if (!callbackHint) {
        setFlow("invalid");
      } else {
        // PKCE code exchange can complete after getSession() returns.
        timeout = window.setTimeout(() => {
          if (active && !verifiedRecoveryEvent) {
            setFlow((current) => current === "ready" ? current : "invalid");
          }
        }, 4000);
      }
    }).catch(() => {
      if (active) setFlow("invalid");
    });

    return () => {
      active = false;
      if (timeout !== undefined) window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (flow !== "ready" || saving) return;
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
      if (authError || !auth.user) throw new Error("Recovery session is unavailable");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmation("");
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
