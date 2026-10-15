import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { passwordRecoveryRedirect } from "@/lib/password-recovery";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "استعادة كلمة المرور | سندك" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { lang } = useSanadak();
  const ar = lang === "ar";
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending || sent) return;
    setSending(true);
    setError("");
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordRecoveryRedirect(window.location.origin),
      });
      if (requestError) throw requestError;
      // Do not reveal whether the address has a registered account.
      setSent(true);
    } catch {
      setError(
        ar
          ? "تعذر إرسال طلب الاستعادة الآن. حاول لاحقًا."
          : "Could not submit the recovery request. Please try again later.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
      <section className="glass-card relative w-full max-w-md rounded-3xl p-6 shadow-float sm:p-8">
        <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {ar ? "العودة لتسجيل الدخول" : "Back to sign in"}
        </Link>
        <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--emerald)]/10 text-[var(--emerald)]">
          <Mail className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{ar ? "استعادة كلمة المرور" : "Reset your password"}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {ar
            ? "اكتب بريدك الإلكتروني لإرسال رابط آمن لإعادة تعيين كلمة المرور."
            : "Enter your email address to request a secure password-reset link."}
        </p>
        {sent ? (
          <div role="status" className="mt-6 rounded-2xl border border-[var(--emerald)]/30 bg-[var(--emerald)]/5 p-4 text-sm leading-7">
            {ar
              ? "لو البريد مسجّل في سندك، هتوصلك رسالة تحتوي على رابط الاستعادة. راجع البريد الوارد والرسائل غير المرغوب فيها."
              : "If this email belongs to a Sanadak account, a recovery link will be sent. Please check your inbox and spam folder."}
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <label htmlFor="recovery-email" className="block text-sm font-semibold">
              {ar ? "البريد الإلكتروني" : "Email address"}
            </label>
            <input
              id="recovery-email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm"
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {sending
                ? (ar ? "جارٍ الإرسال…" : "Sending…")
                : (ar ? "إرسال رابط الاستعادة" : "Send recovery link")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
