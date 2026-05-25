import { motion } from "motion/react";
import { Clock, Star, MapPin, Stethoscope, ShoppingBag, Navigation, Sparkles, ChevronRight, Heart, Plus } from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";
import { toast } from "sonner";
import { useState } from "react";

function SectionLabel({ ar, en, lang }: { ar: string; en: string; lang: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="h-px w-8 bg-gradient-brand" />
      <span className={`text-sm text-[var(--emerald)] font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{ar}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{en}</span>
    </div>
  );
}

function ServiceBlock({
  index, ar, en, title, desc, children,
}: { index: string; ar: string; en: string; title: string; desc: string; children: React.ReactNode }) {
  const { lang, t } = useSanadak();
  const reverse = parseInt(index) % 2 === 0;
  return (
    <div className={`grid lg:grid-cols-2 gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}>
        <SectionLabel ar={ar} en={`${index} · ${en}`} lang={lang} />
        <h3 className={`text-3xl md:text-5xl font-semibold tracking-tight leading-tight ${lang === "ar" ? "font-arabic" : ""}`}>{title}</h3>
        <p className={`mt-4 text-muted-foreground max-w-md leading-relaxed ${lang === "ar" ? "font-arabic" : ""}`}>{desc}</p>
        <a href="#" className={`inline-flex items-center gap-1 mt-6 text-sm font-medium text-[var(--emerald)] hover:gap-2 transition-all ${lang === "ar" ? "font-arabic" : ""}`}>
          {t("learn_more")} <ChevronRight className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
        </a>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
        {children}
      </motion.div>
    </div>
  );
}

function FoodMock() {
  const { addToCart, t, lang } = useSanadak();
  const items = [
    { id: "f1", n: lang === "ar" ? "نجد جريل" : "Najd Grill", t: lang === "ar" ? "سعودي · فاخر" : "Saudi · Premium", r: 4.9, p: 185, c: "from-amber-400/30 to-orange-500/20" },
    { id: "f2", n: lang === "ar" ? "سوشي لاب" : "Sushi Lab", t: lang === "ar" ? "ياباني" : "Japanese", r: 4.8, p: 240, c: "from-emerald-400/30 to-teal-500/20" },
    { id: "f3", n: lang === "ar" ? "أوليڤ آند أوك" : "Olive & Oak", t: lang === "ar" ? "متوسطي" : "Mediterranean", r: 4.7, p: 160, c: "from-lime-400/30 to-emerald-500/20" },
    { id: "f4", n: lang === "ar" ? "كافيه نوار" : "Café Noir", t: lang === "ar" ? "قهوة · مخبز" : "Coffee · Bakery", r: 4.9, p: 95, c: "from-orange-400/30 to-rose-500/20" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("delivering_to")}</div>
            <div className={`font-medium flex items-center gap-1 ${lang === "ar" ? "font-arabic" : ""}`}><MapPin className="h-3.5 w-3.5 text-[var(--ember)]" /> {t("cairo_area")}</div>
          </div>
          <div className="glass-panel rounded-full px-3 py-1 text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> 22 min</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-foreground/5 overflow-hidden bg-card">
              <div className={`h-20 bg-gradient-to-br ${r.c} relative`}>
                <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/70 grid place-items-center"><Heart className="h-3.5 w-3.5" /></button>
              </div>
              <div className="p-2.5">
                <div className={`text-sm font-medium truncate ${lang === "ar" ? "font-arabic" : ""}`}>{r.n}</div>
                <div className={`text-[11px] text-muted-foreground flex items-center justify-between mt-0.5 ${lang === "ar" ? "font-arabic" : ""}`}>
                  <span>{r.t}</span>
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-[var(--ember)] text-[var(--ember)]" /> {r.r}</span>
                </div>
                <button
                  onClick={() => { addToCart({ id: r.id, name: r.n, price: r.p }); toast.success(t("added")); }}
                  className={`mt-2 w-full bg-gradient-brand text-primary-foreground text-[11px] font-medium h-7 rounded-lg flex items-center justify-center gap-1 ${lang === "ar" ? "font-arabic" : ""}`}
                >
                  <Plus className="h-3 w-3" /> {r.p} {t("sar")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-6 -right-4 glass-card rounded-2xl px-4 py-3 shadow-ember flex items-center gap-3 animate-float-slow">
        <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground"><Clock className="h-4 w-4" /></div>
        <div>
          <div className={`text-[11px] text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("order")}SND-2847</div>
          <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{t("out_for_delivery")}</div>
        </div>
      </div>
    </div>
  );
}

function MedicalMock() {
  const { addBooking, t, lang } = useSanadak();
  const days = lang === "ar" ? ["إث", "ثل", "أر", "خم", "جم", "سب", "أح"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = ["09:00", "10:30", "13:00", "16:00"];
  const [dayIdx, setDayIdx] = useState(2);
  const [slotIdx, setSlotIdx] = useState(1);
  const doctor = lang === "ar" ? "د. ليلى الحربي" : "Dr. Layla Al-Harbi";
  const spec = lang === "ar" ? "أمراض قلب · مستشفى دار الفؤاد" : "Cardiologist · Dar Al Fouad Hospital";

  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400/40 to-teal-500/30 grid place-items-center"><Stethoscope className="h-5 w-5 text-[var(--emerald)]" /></div>
          <div>
            <div className={`font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{doctor}</div>
            <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{spec}</div>
          </div>
          <div className="ms-auto text-xs font-medium text-[var(--emerald)] flex items-center gap-1"><Star className="h-3 w-3 fill-[var(--ember)] text-[var(--ember)]" /> 4.96</div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {days.map((d, i) => (
            <button key={d + i} onClick={() => setDayIdx(i)} className={`rounded-xl py-2 text-center text-xs border transition ${i === dayIdx ? "bg-gradient-brand text-primary-foreground border-transparent" : "border-foreground/5 bg-background/40 hover:bg-foreground/5"}`}>
              <div className={`opacity-70 ${lang === "ar" ? "font-arabic" : ""}`}>{d}</div>
              <div className="font-semibold mt-0.5">{12 + i}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {slots.map((s, i) => (
            <button key={s} onClick={() => setSlotIdx(i)} className={`rounded-lg py-2 text-center text-xs border transition ${i === slotIdx ? "border-[var(--emerald)] text-[var(--emerald)] bg-[var(--emerald)]/5" : "border-foreground/5 text-muted-foreground hover:border-foreground/15"}`}>{s}</button>
          ))}
        </div>
        <button
          onClick={() => { addBooking({ doctor, specialty: spec, day: `${days[dayIdx]} ${12 + dayIdx}`, time: slots[slotIdx] }); toast.success(t("booked")); }}
          className={`mt-4 w-full bg-gradient-brand text-primary-foreground h-10 rounded-xl text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}
        >
          {t("confirm_booking")} · {slots[slotIdx]}
        </button>
      </div>
      <div className={`absolute -top-5 -left-5 glass-card rounded-2xl px-3 py-2 text-xs flex items-center gap-2 animate-float-slow ${lang === "ar" ? "font-arabic" : ""}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {t("insurance")}
      </div>
    </div>
  );
}

function ShoppingMock() {
  const { addToCart, t, lang } = useSanadak();
  const items = [
    { id: "s1", n: lang === "ar" ? "إيرپودز برو" : "AirPods Pro", p: 8990, c: "from-zinc-300/40 to-zinc-500/30" },
    { id: "s2", n: lang === "ar" ? "عباية كتان" : "Linen Abaya", p: 1450, c: "from-stone-300/40 to-amber-400/20" },
    { id: "s3", n: lang === "ar" ? "عطر عود" : "Oud Essence", p: 3250, c: "from-amber-400/40 to-orange-600/30" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center justify-between mb-4">
          <div className={`font-medium flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}><ShoppingBag className="h-4 w-4 text-[var(--emerald)]" /> {t("marketplace")}</div>
          <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("curated")}</div>
        </div>
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-foreground/5 transition-colors">
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${it.c}`} />
              <div className="flex-1">
                <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{it.n}</div>
                <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "توصيل مجاني · غداً" : "Free delivery · Tomorrow"}</div>
              </div>
              <div className="text-sm font-semibold">{it.p.toLocaleString()} {t("sar")}</div>
              <button
                onClick={() => { addToCart({ id: it.id, name: it.n, price: it.p }); toast.success(t("added")); }}
                className="h-8 w-8 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 glass-card rounded-2xl px-4 py-3 shadow-glow flex items-center gap-3 animate-float-slow">
        <div className="h-9 w-9 rounded-xl bg-[var(--ember)]/20 text-[var(--ember)] grid place-items-center text-xs font-bold">−30%</div>
        <div>
          <div className={`text-[11px] text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("flash_sale")}</div>
          <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{t("ends_in")} 02:14:08</div>
        </div>
      </div>
    </div>
  );
}

function DeliveryMock() {
  const { t, lang } = useSanadak();
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className={`font-medium flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}><Navigation className="h-4 w-4 text-[var(--emerald)]" /> {t("live_tracking")}</div>
          <div className={`glass-panel rounded-full px-3 py-1 text-xs ${lang === "ar" ? "font-arabic" : ""}`}>{t("eta")} · 8 min</div>
        </div>
        <div className="relative h-56 rounded-2xl bg-gradient-to-br from-[var(--emerald)]/10 via-[var(--teal)]/10 to-[var(--ember)]/10 overflow-hidden border border-foreground/5">
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="route" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.66 0.14 165)" />
                <stop offset="100%" stopColor="oklch(0.78 0.16 65)" />
              </linearGradient>
            </defs>
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="220" stroke="currentColor" className="text-foreground/5" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="currentColor" className="text-foreground/5" />
            ))}
            <path d="M30,180 C 100,160 130,80 220,90 S 350,40 380,30" stroke="url(#route)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="6 6">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite" />
            </path>
            <circle cx="30" cy="180" r="6" fill="oklch(0.78 0.16 65)" />
            <circle cx="380" cy="30" r="6" fill="oklch(0.66 0.14 165)" />
            <circle cx="220" cy="90" r="8" fill="white" stroke="oklch(0.66 0.14 165)" strokeWidth="3">
              <animate attributeName="r" values="8;11;8" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div className={`absolute top-3 left-3 glass-panel rounded-xl px-3 py-1.5 text-[11px] ${lang === "ar" ? "font-arabic" : ""}`}>{t("courier")}</div>
          <div className={`absolute bottom-3 right-3 glass-panel rounded-xl px-3 py-1.5 text-[11px] ${lang === "ar" ? "font-arabic" : ""}`}>2.3 {t("away")}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[{ l: t("picked"), a: true }, { l: t("in_transit"), a: true }, { l: t("delivered"), a: false }].map((s) => (
            <div key={s.l} className={`rounded-xl py-2 text-xs border ${s.a ? "border-[var(--emerald)] bg-[var(--emerald)]/5 text-[var(--emerald)]" : "border-foreground/10 text-muted-foreground"} ${lang === "ar" ? "font-arabic" : ""}`}>{s.l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HubMock() {
  const { t, lang } = useSanadak();
  const apps = [
    { n: t("nav_food"), i: "🍱" }, { n: t("nav_health"), i: "🩺" }, { n: lang === "ar" ? "تسوق" : "Shop", i: "🛍" }, { n: lang === "ar" ? "تتبع" : "Track", i: "📍" },
    { n: lang === "ar" ? "دفع" : "Pay", i: "💳" }, { n: lang === "ar" ? "سفر" : "Travel", i: "✈️" }, { n: lang === "ar" ? "صيدلية" : "Pharmacy", i: "💊" }, { n: lang === "ar" ? "المزيد" : "More", i: "✨" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center justify-between mb-4">
          <div className={`font-medium flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}><Sparkles className="h-4 w-4 text-[var(--emerald)]" /> {t("super_app")}</div>
          <div className={`text-xs text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>{t("ai_suggest")}</div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {apps.map((a) => (
            <div key={a.n} className="aspect-square rounded-2xl border border-foreground/5 bg-background/60 grid place-items-center text-center hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <div>
                <div className="text-2xl">{a.i}</div>
                <div className={`text-[11px] mt-1 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{a.n}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl p-3 bg-gradient-brand text-primary-foreground flex items-center gap-3">
          <Sparkles className="h-4 w-4" />
          <div className={`text-xs ${lang === "ar" ? "font-arabic" : ""}`}>
            <div className="font-medium">{t("based_on")}</div>
            <div className="opacity-80">{t("suggestion")}</div>
          </div>
          <button className={`ms-auto text-xs bg-background/20 backdrop-blur rounded-full px-3 py-1 ${lang === "ar" ? "font-arabic" : ""}`}>{t("apply")}</button>
        </div>
      </div>
    </div>
  );
}

export function ServiceShowcase() {
  const { t, lang } = useSanadak();
  return (
    <section id="services" className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto space-y-32">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel ar={t("section_ar")} en={t("section_en")} lang={lang} />
          <h2 className={`text-4xl md:text-6xl font-semibold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("headline_a")} <span className="text-gradient-brand">{t("headline_b")}</span>
          </h2>
          <p className={`mt-4 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("headline_sub")}</p>
        </div>

        <div id="food"><ServiceBlock index="01" ar={t("nav_food")} en="Food delivery" title={t("food_title")} desc={t("food_desc")}><FoodMock /></ServiceBlock></div>
        <div id="health"><ServiceBlock index="02" ar={t("nav_health")} en="Medical bookings" title={t("health_title")} desc={t("health_desc")}><MedicalMock /></ServiceBlock></div>
        <div id="shopping"><ServiceBlock index="03" ar={t("nav_shopping")} en="Marketplace" title={t("shop_title")} desc={t("shop_desc")}><ShoppingMock /></ServiceBlock></div>
        <div id="track"><ServiceBlock index="04" ar={t("nav_track")} en="Live tracking" title={t("track_title")} desc={t("track_desc")}><DeliveryMock /></ServiceBlock></div>
        <div id="hub"><ServiceBlock index="05" ar={lang === "ar" ? "السوبر-آب" : "Hub"} en="Services hub" title={t("hub_title")} desc={t("hub_desc")}><HubMock /></ServiceBlock></div>
      </div>
    </section>
  );
}
