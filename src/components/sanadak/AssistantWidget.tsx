import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

type Msg = { id: string; from: "bot" | "user"; text: string; route?: string; routeLabel?: string };

const intents: Array<{ kw: string[]; route: string; key: string }> = [
  { kw: ["مطعم", "اكل", "أكل", "طعام", "food", "restaurant", "كباب", "كفتة", "سوشي", "شاورما"], route: "/restaurants", key: "cat_restaurants" },
  { kw: ["كافيه", "قهوة", "كوفي", "cafe", "coffee", "لاتيه"], route: "/cafes", key: "cat_cafes" },
  { kw: ["ملابس", "تسوق", "هدوم", "shop", "fashion", "حذاء", "تيشيرت", "جينز"], route: "/shops", key: "cat_shops" },
  { kw: ["قاعة", "فرح", "زفاف", "wedding", "hall"], route: "/halls", key: "cat_halls" },
  { kw: ["سوبر", "خضار", "فاكهة", "بقالة", "supermarket", "market", "لحوم"], route: "/super", key: "cat_super" },
  { kw: ["دواء", "صيدلية", "pharmacy", "بنادول", "فيتامين"], route: "/pharmacy", key: "cat_pharmacy" },
  { kw: ["دكتور", "طبيب", "doctor", "حجز طبي", "اطفال", "أطفال", "قلب", "جلدية"], route: "/medical", key: "nav_health" },
];

export function AssistantWidget() {
  const { assistantOpen, setAssistantOpen, t, lang, dir } = useSanadak();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (assistantOpen && msgs.length === 0) {
      setMsgs([{ id: "w", from: "bot", text: t("assistant_welcome") }]);
    }
  }, [assistantOpen, msgs.length, t]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, assistantOpen]);

  const reply = (text: string) => {
    const low = text.toLowerCase();
    const hit = intents.find((i) => i.kw.some((k) => low.includes(k.toLowerCase())));
    if (hit) {
      return { text: lang === "ar" ? `وجدت لك القسم المناسب: ${t(hit.key)}. اضغط بالأسفل للدخول.` : `Found the right section: ${t(hit.key)}. Tap below to open.`, route: hit.route, routeLabel: t(hit.key) };
    }
    return { text: lang === "ar" ? "تقدر تجرب: مطاعم، كافيهات، صيدلية، دكتور، سوبرماركت، قاعات أفراح، أو محلات." : "Try asking about: restaurants, cafés, pharmacy, doctor, supermarket, wedding halls, or shops." };
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    const user: Msg = { id: crypto.randomUUID(), from: "user", text };
    sfx.tap();
    setMsgs((m) => [...m, user]);
    setInput("");
    setTimeout(() => {
      const r = reply(text);
      sfx.success();
      setMsgs((m) => [...m, { id: crypto.randomUUID(), from: "bot", ...r }]);
    }, 350);
  };

  const suggestions = [
    { label: lang === "ar" ? "أكل دلوقتي 🍔" : "Food now 🍔", q: lang === "ar" ? "عايز اكل" : "I want food" },
    { label: lang === "ar" ? "دكتور أطفال 🩺" : "Pediatrician 🩺", q: lang === "ar" ? "حجز دكتور اطفال" : "Book pediatrician" },
    { label: lang === "ar" ? "صيدلية 💊" : "Pharmacy 💊", q: lang === "ar" ? "دواء" : "Medicine" },
    { label: lang === "ar" ? "قاعة فرح 💍" : "Wedding hall 💍", q: lang === "ar" ? "قاعة فرح" : "Wedding hall" },
  ];

  return (
    <>
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 220, damping: 16 }}
        onClick={() => { setAssistantOpen(!assistantOpen); sfx.open(); }}
        aria-label={t("open_assistant")}
        className={`fixed z-50 bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} h-14 w-14 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shadow-glow animate-glow-pulse hover:scale-105 transition`}
      >
        {assistantOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-50 bottom-24 ${dir === "rtl" ? "left-6" : "right-6"} w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-8rem))] glass-card rounded-3xl flex flex-col overflow-hidden shadow-float`}
          >
            <div className="p-4 border-b border-foreground/5 flex items-center gap-3 bg-gradient-brand text-primary-foreground">
              <div className="h-10 w-10 rounded-2xl bg-white/20 grid place-items-center"><Sparkles className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{t("assistant_title")}</div>
                <div className="text-[11px] opacity-90">Sanadak AI · Beta</div>
              </div>
              <button onClick={() => setAssistantOpen(false)} className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.from === "user" ? "bg-gradient-brand text-primary-foreground" : "glass-panel"} ${lang === "ar" ? "font-arabic" : ""}`}>
                    <div>{m.text}</div>
                    {m.route && (
                      <Link to={m.route} onClick={() => setAssistantOpen(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--emerald)] hover:underline">
                        {t("assistant_open_section")} → {m.routeLabel}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {msgs.length <= 1 && (
                <div className="pt-2">
                  <div className={`text-[11px] text-muted-foreground mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>{t("quick_suggestions")}</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button key={s.label} onClick={() => send(s.q)} className={`text-xs px-3 py-1.5 rounded-full glass-panel hover:bg-foreground/5 ${lang === "ar" ? "font-arabic" : ""}`}>{s.label}</button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-foreground/5 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder={t("assistant_placeholder")}
                className={`flex-1 h-11 rounded-full glass-panel px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/40 ${lang === "ar" ? "font-arabic" : ""}`}
              />
              <button onClick={() => send()} className="h-11 w-11 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shadow-glow hover:scale-105 transition">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
