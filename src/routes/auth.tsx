import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول · سندك" },
      { name: "description", content: "سجل دخولك إلى منصة سندك" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { lang, t } = useSanadak();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .eq("role", "admin")
            .maybeSingle();
          if (data) {
            sfx.success();
            toast.success(lang === "ar" ? "أهلاً بعودتك!" : "Welcome back!");
            navigate({ to: "/admin" });
          } else {
            sfx.success();
            toast.success(lang === "ar" ? "أهلاً بعودتك!" : "Welcome back!");
            navigate({ to: "/" });
          }
        }, 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setTimeout(async () => {
          const { data: r } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.session!.user.id)
            .eq("role", "admin")
            .maybeSingle();
          navigate({ to: r ? "/admin" : "/" });
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, lang]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        sfx.success();
        toast.success(lang === "ar" ? "تم إنشاء الحساب! تحقق من بريدك." : "Account created! Check your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will handle navigation + toast
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message);
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen grid place-items-center px-4 py-24">
      <div className="absolute inset-0 bg-gradient-hero opacity-60 pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md glass-card rounded-3xl p-8 shadow-float"
      >
        <Link to="/" className={`text-xs text-muted-foreground hover:text-foreground ${lang === "ar" ? "font-arabic" : ""}`}>← {t("back_home")}</Link>
        <h1 className={`mt-3 text-3xl font-bold text-gradient-brand ${lang === "ar" ? "font-arabic" : ""}`}>
          {mode === "login" ? (lang === "ar" ? "تسجيل الدخول" : "Sign in") : (lang === "ar" ? "إنشاء حساب" : "Create account")}
        </h1>
        <p className={`mt-1 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
          {lang === "ar" ? "ادخل إلى عالم سندك" : "Welcome to Sanadak"}
        </p>

        <button
          onClick={google}
          disabled={loading}
          className="mt-6 w-full h-12 rounded-full glass-panel flex items-center justify-center gap-3 font-medium hover:bg-foreground/5 transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {lang === "ar" ? "متابعة عبر Google" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-foreground/10" />
          {lang === "ar" ? "أو" : "or"}
          <div className="flex-1 h-px bg-foreground/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <UserIcon className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ar" ? "الاسم بالكامل" : "Full name"} className="w-full h-12 rounded-xl border border-input bg-background ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full h-12 rounded-xl border border-input bg-background ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          </div>
          <div className="relative">
            <Lock className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <input required type="password" dir="ltr" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={lang === "ar" ? "كلمة السر (٦ أحرف على الأقل)" : "Password (min 6 chars)"} className="w-full h-12 rounded-xl border border-input bg-background ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          </div>
          <button disabled={loading} type="submit" className={`w-full h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.01] transition flex items-center justify-center gap-2 disabled:opacity-50 ${lang === "ar" ? "font-arabic" : ""}`}>
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "login" ? (lang === "ar" ? "دخول" : "Sign in") : (lang === "ar" ? "إنشاء" : "Sign up")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className={`mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
          {mode === "login"
            ? (lang === "ar" ? "ليس لديك حساب؟ إنشاء حساب" : "No account? Create one")
            : (lang === "ar" ? "لديك حساب؟ تسجيل دخول" : "Have an account? Sign in")}
        </button>
      </motion.div>
    </main>
  );
}
