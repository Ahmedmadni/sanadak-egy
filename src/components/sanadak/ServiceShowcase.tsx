import { motion } from "motion/react";
import { Clock, Star, MapPin, Stethoscope, ShoppingBag, Navigation, Sparkles, ChevronRight, Heart } from "lucide-react";

function SectionLabel({ ar, en }: { ar: string; en: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="h-px w-8 bg-gradient-brand" />
      <span className="font-arabic text-sm text-[var(--emerald)] font-medium">{ar}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{en}</span>
    </div>
  );
}

function ServiceBlock({
  index, ar, en, title, desc, children,
}: { index: string; ar: string; en: string; title: string; desc: string; children: React.ReactNode }) {
  const reverse = parseInt(index) % 2 === 0;
  return (
    <div className={`grid lg:grid-cols-2 gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <SectionLabel ar={ar} en={`${index} · ${en}`} />
        <h3 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">{title}</h3>
        <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">{desc}</p>
        <a href="#" className="inline-flex items-center gap-1 mt-6 text-sm font-medium text-[var(--emerald)] hover:gap-2 transition-all">
          Learn more <ChevronRight className="h-4 w-4" />
        </a>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* --- Mock UI panels for each service --- */

function FoodMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Delivering to</div>
            <div className="font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--ember)]" /> Riyadh, Olaya</div>
          </div>
          <div className="glass-panel rounded-full px-3 py-1 text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> 22 min</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { n: "Najd Grill", t: "Saudi · Premium", r: 4.9, c: "from-amber-400/30 to-orange-500/20" },
            { n: "Sushi Lab", t: "Japanese", r: 4.8, c: "from-emerald-400/30 to-teal-500/20" },
            { n: "Olive & Oak", t: "Mediterranean", r: 4.7, c: "from-lime-400/30 to-emerald-500/20" },
            { n: "Café Noir", t: "Coffee · Bakery", r: 4.9, c: "from-orange-400/30 to-rose-500/20" },
          ].map((r) => (
            <div key={r.n} className="rounded-2xl border border-foreground/5 overflow-hidden bg-card">
              <div className={`h-20 bg-gradient-to-br ${r.c} relative`}>
                <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/70 grid place-items-center"><Heart className="h-3.5 w-3.5" /></button>
              </div>
              <div className="p-2.5">
                <div className="text-sm font-medium truncate">{r.n}</div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between mt-0.5">
                  <span>{r.t}</span>
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-[var(--ember)] text-[var(--ember)]" /> {r.r}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-6 -right-4 glass-card rounded-2xl px-4 py-3 shadow-ember flex items-center gap-3 animate-float-slow">
        <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground"><Clock className="h-4 w-4" /></div>
        <div>
          <div className="text-[11px] text-muted-foreground">Order #SND-2847</div>
          <div className="text-sm font-medium">Out for delivery</div>
        </div>
      </div>
    </div>
  );
}

function MedicalMock() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = ["09:00", "10:30", "13:00", "16:00"];
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400/40 to-teal-500/30 grid place-items-center"><Stethoscope className="h-5 w-5 text-[var(--emerald)]" /></div>
          <div>
            <div className="font-medium">Dr. Layla Al-Harbi</div>
            <div className="text-xs text-muted-foreground">Cardiologist · King Faisal Specialist</div>
          </div>
          <div className="ml-auto text-xs font-medium text-[var(--emerald)] flex items-center gap-1"><Star className="h-3 w-3 fill-[var(--ember)] text-[var(--ember)]" /> 4.96</div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {days.map((d, i) => (
            <div key={d} className={`rounded-xl py-2 text-center text-xs border ${i === 2 ? "bg-gradient-brand text-primary-foreground border-transparent" : "border-foreground/5 bg-background/40"}`}>
              <div className="opacity-70">{d}</div>
              <div className="font-semibold mt-0.5">{12 + i}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {slots.map((s, i) => (
            <div key={s} className={`rounded-lg py-2 text-center text-xs border ${i === 1 ? "border-[var(--emerald)] text-[var(--emerald)] bg-[var(--emerald)]/5" : "border-foreground/5 text-muted-foreground"}`}>{s}</div>
          ))}
        </div>
        <button className="mt-4 w-full bg-gradient-brand text-primary-foreground h-10 rounded-xl text-sm font-medium">
          <span className="font-arabic">احجز الموعد</span> · Confirm 10:30
        </button>
      </div>
      <div className="absolute -top-5 -left-5 glass-card rounded-2xl px-3 py-2 text-xs flex items-center gap-2 animate-float-slow">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Insurance covered · بوبا
      </div>
    </div>
  );
}

function ShoppingMock() {
  const items = [
    { n: "AirPods Pro", p: "899 SAR", c: "from-zinc-300/40 to-zinc-500/30" },
    { n: "Linen Abaya", p: "440 SAR", c: "from-stone-300/40 to-amber-400/20" },
    { n: "Oud Essence", p: "1,250 SAR", c: "from-amber-400/40 to-orange-600/30" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[var(--emerald)]" /> Marketplace</div>
          <div className="text-xs text-muted-foreground">Curated for you</div>
        </div>
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.n} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-foreground/5 transition-colors">
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${it.c}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{it.n}</div>
                <div className="text-xs text-muted-foreground">Free delivery · Tomorrow</div>
              </div>
              <div className="text-sm font-semibold">{it.p}</div>
              <button className="h-8 w-8 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center text-lg leading-none">+</button>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 glass-card rounded-2xl px-4 py-3 shadow-glow flex items-center gap-3 animate-float-slow">
        <div className="h-9 w-9 rounded-xl bg-[var(--ember)]/20 text-[var(--ember)] grid place-items-center text-xs font-bold">−30%</div>
        <div>
          <div className="text-[11px] text-muted-foreground">Flash sale</div>
          <div className="text-sm font-medium">Ends in 02:14:08</div>
        </div>
      </div>
    </div>
  );
}

function DeliveryMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium flex items-center gap-2"><Navigation className="h-4 w-4 text-[var(--emerald)]" /> Live tracking</div>
          <div className="glass-panel rounded-full px-3 py-1 text-xs">ETA · 8 min</div>
        </div>
        <div className="relative h-56 rounded-2xl bg-gradient-to-br from-[var(--emerald)]/10 via-[var(--teal)]/10 to-[var(--ember)]/10 overflow-hidden border border-foreground/5">
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="route" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.66 0.14 165)" />
                <stop offset="100%" stopColor="oklch(0.78 0.16 65)" />
              </linearGradient>
            </defs>
            {/* grid */}
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
          <div className="absolute top-3 left-3 glass-panel rounded-xl px-3 py-1.5 text-[11px]">Courier · Ahmed</div>
          <div className="absolute bottom-3 right-3 glass-panel rounded-xl px-3 py-1.5 text-[11px]">2.3 km away</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[{ l: "Picked", a: true }, { l: "In transit", a: true }, { l: "Delivered", a: false }].map((s) => (
            <div key={s.l} className={`rounded-xl py-2 text-xs border ${s.a ? "border-[var(--emerald)] bg-[var(--emerald)]/5 text-[var(--emerald)]" : "border-foreground/10 text-muted-foreground"}`}>{s.l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HubMock() {
  const apps = [
    { n: "Food", i: "🍱" }, { n: "Health", i: "🩺" }, { n: "Shop", i: "🛍" }, { n: "Track", i: "📍" },
    { n: "Pay", i: "💳" }, { n: "Travel", i: "✈️" }, { n: "Pharmacy", i: "💊" }, { n: "More", i: "✨" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-gradient-hero opacity-60 blur-3xl" />
      <div className="relative glass-card rounded-3xl p-5 shadow-float">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--emerald)]" /> Super-app hub</div>
          <div className="text-xs text-[var(--emerald)]">AI suggestions</div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {apps.map((a) => (
            <div key={a.n} className="aspect-square rounded-2xl border border-foreground/5 bg-background/60 grid place-items-center text-center hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <div>
                <div className="text-2xl">{a.i}</div>
                <div className="text-[11px] mt-1 text-muted-foreground">{a.n}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl p-3 bg-gradient-brand text-primary-foreground flex items-center gap-3">
          <Sparkles className="h-4 w-4" />
          <div className="text-xs">
            <div className="font-medium">Based on your week</div>
            <div className="opacity-80">Book a clinic visit + reorder coffee</div>
          </div>
          <button className="ml-auto text-xs bg-background/20 backdrop-blur rounded-full px-3 py-1">Apply</button>
        </div>
      </div>
    </div>
  );
}

export function ServiceShowcase() {
  return (
    <section id="services" className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto space-y-32">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel ar="منظومة سندك" en="The Sanadak ecosystem" />
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">
            One app. <span className="text-gradient-brand">Every service.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            خمس تجارب مصممة بدقة، تعمل معاً كأنها واحدة — مدعومة بذكاءٍ يفهم احتياجك.
          </p>
        </div>

        <div id="food"><ServiceBlock index="01" ar="طعام" en="Food delivery" title="Restaurant-grade taste, delivered in minutes." desc="Curated menus from premium kitchens across the Kingdom, with live ETA, smart routing, and a checkout that feels native to your phone."><FoodMock /></ServiceBlock></div>
        <div id="health"><ServiceBlock index="02" ar="مواعيد طبية" en="Medical bookings" title="Book the right doctor — in under a minute." desc="Browse specialists, view live availability, and confirm appointments instantly. Insurance, records and reminders, all in one place."><MedicalMock /></ServiceBlock></div>
        <div id="shopping"><ServiceBlock index="03" ar="تسوق" en="Marketplace" title="A marketplace that learns your taste." desc="Premium brands, local artisans, and exclusive drops — assembled into a single beautifully ordered storefront."><ShoppingMock /></ServiceBlock></div>
        <div id="track"><ServiceBlock index="04" ar="تتبع التوصيل" en="Live tracking" title="Watch every order glide to your door." desc="Real-time logistics with intelligent routing, animated progress, and proactive ETAs so you're never left guessing."><DeliveryMock /></ServiceBlock></div>
        <div id="hub"><ServiceBlock index="05" ar="مركز الخدمات" en="Services hub" title="A connected super-app. Designed to disappear." desc="All your essentials unified into one quiet, intelligent interface. Sanadak suggests what's next so you don't have to search."><HubMock /></ServiceBlock></div>
      </div>
    </section>
  );
}
