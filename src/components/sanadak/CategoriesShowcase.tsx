import { motion } from "motion/react";
import { useState } from "react";
import {
  UtensilsCrossed, Coffee, ShoppingBag, ShoppingCart as Cart, Pill,
  Stethoscope, Star, Clock, MapPin, Plus, MessageCircle, Users, Sparkles,
} from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { openWhatsApp, generateSerial } from "@/lib/whatsapp";
import { toast } from "sonner";

/* ---------- Shared helpers ---------- */

function SectionHead({ idx, ar, en, title, desc }: { idx: string; ar: string; en: string; title: string; desc: string }) {
  const { lang } = useSanadak();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}
      className="text-center max-w-2xl mx-auto mb-12"
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="h-px w-8 bg-gradient-brand" />
        <span className={`text-sm text-[var(--emerald)] font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{idx} · {ar}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-widest">{en}</span>
        <span className="h-px w-8 bg-gradient-brand" />
      </div>
      <h3 className={`text-3xl md:text-5xl font-semibold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>{title}</h3>
      <p className={`mt-3 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{desc}</p>
    </motion.div>
  );
}

function StoreHeader({ name, area, rating, eta, min, color, Icon }: { name: string; area: string; rating: number; eta?: string; min?: number; color: string; Icon: any }) {
  const { lang, t } = useSanadak();
  return (
    <div className="flex items-center gap-3">
      <div className={`h-12 w-12 rounded-2xl grid place-items-center text-white ${color}`}><Icon className="h-5 w-5" /></div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{name}</div>
        <div className={`text-xs text-muted-foreground flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
          <MapPin className="h-3 w-3" /> {area}
          <span>·</span>
          <Star className="h-3 w-3 fill-[var(--ember)] text-[var(--ember)]" /> {rating}
          {eta && (<><span>·</span><Clock className="h-3 w-3" /> {eta} {t("minutes")}</>)}
        </div>
      </div>
      {min !== undefined && (
        <div className={`text-[11px] text-muted-foreground glass-panel rounded-full px-2 py-1 ${lang === "ar" ? "font-arabic" : ""}`}>
          {t("min_order")} {min} {t("sar")}
        </div>
      )}
    </div>
  );
}

/* ---------- 1. Restaurants ---------- */

type Dish = { id: string; n: string; ne: string; p: number; sizes?: { l: string; le: string; add: number }[]; desc?: string };
type Resto = { id: string; n: string; ne: string; area: string; areae: string; rating: number; eta: string; min: number; color: string; menu: Dish[] };

const restos: Resto[] = [
  {
    id: "abou-shakra", n: "أبو شقرة", ne: "Abou Shakra", area: "جاردن سيتي", areae: "Garden City",
    rating: 4.8, eta: "35", min: 100, color: "bg-gradient-to-br from-amber-500 to-orange-600",
    menu: [
      { id: "kebab", n: "كباب لحم بتلو", ne: "Veal kebab", p: 320, sizes: [{ l: "نصف كيلو", le: "Half kg", add: 0 }, { l: "كيلو", le: "1 kg", add: 280 }] },
      { id: "kofta", n: "كفتة مشوية", ne: "Grilled kofta", p: 280, sizes: [{ l: "نصف كيلو", le: "Half kg", add: 0 }, { l: "كيلو", le: "1 kg", add: 240 }] },
      { id: "mix-grill", n: "مشويات مشكلة", ne: "Mixed grill", p: 420 },
      { id: "rice", n: "أرز بالشعرية", ne: "Rice with vermicelli", p: 35 },
    ],
  },
  {
    id: "kazoku", n: "كازوكو سوشي", ne: "Kazoku Sushi", area: "الزمالك", areae: "Zamalek",
    rating: 4.9, eta: "40", min: 150, color: "bg-gradient-to-br from-rose-500 to-pink-600",
    menu: [
      { id: "salmon", n: "سلمون نيجيري (٨ قطع)", ne: "Salmon Nigiri (8 pcs)", p: 380 },
      { id: "rainbow", n: "رينبو رول", ne: "Rainbow roll", p: 295 },
      { id: "ramen", n: "رامن دجاج", ne: "Chicken ramen", p: 240, sizes: [{ l: "عادي", le: "Regular", add: 0 }, { l: "لارج", le: "Large", add: 60 }] },
    ],
  },
  {
    id: "felfela", n: "فلفلة الشعبي", ne: "Felfela", area: "وسط البلد", areae: "Downtown",
    rating: 4.6, eta: "30", min: 60, color: "bg-gradient-to-br from-emerald-500 to-teal-600",
    menu: [
      { id: "foul", n: "فول إسكندراني", ne: "Alex foul", p: 45 },
      { id: "ta3meya", n: "طعمية (٦ قطع)", ne: "Falafel (6)", p: 35 },
      { id: "shawarma", n: "شاورما دجاج", ne: "Chicken shawarma", p: 95, sizes: [{ l: "ساندويتش", le: "Sandwich", add: 0 }, { l: "وجبة", le: "Meal", add: 65 }] },
    ],
  },
];

function RestoCard({ r }: { r: Resto }) {
  const { lang, t } = useSanadak();
  const [open, setOpen] = useState(false);
  return (
    <motion.div whileHover={{ y: -4 }} className="glass-card rounded-3xl p-5 transition-all">
      <StoreHeader name={lang === "ar" ? r.n : r.ne} area={lang === "ar" ? r.area : r.areae} rating={r.rating} eta={r.eta} min={r.min} color={r.color} Icon={UtensilsCrossed} />
      <button onClick={() => { setOpen(!open); sfx.tap(); }} className={`mt-4 w-full glass-panel rounded-xl h-10 text-sm font-medium hover:bg-foreground/5 ${lang === "ar" ? "font-arabic" : ""}`}>
        {open ? "—" : `${t("menu")} (${r.menu.length})`}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2 overflow-hidden">
          {r.menu.map((d) => <DishRow key={d.id} d={d} store={lang === "ar" ? r.n : r.ne} cat="restaurant" />)}
        </motion.div>
      )}
    </motion.div>
  );
}

function DishRow({ d, store, cat }: { d: Dish; store: string; cat: string }) {
  const { lang, t, addToCart } = useSanadak();
  const [sizeIdx, setSizeIdx] = useState(0);
  const size = d.sizes?.[sizeIdx];
  const price = d.p + (size?.add ?? 0);
  return (
    <div className="rounded-2xl border border-foreground/5 p-3 bg-background/40">
      <div className="flex items-center justify-between gap-2">
        <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? d.n : d.ne}</div>
        <div className="text-sm font-semibold whitespace-nowrap">{price} {t("sar")}</div>
      </div>
      {d.sizes && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.sizes.map((s, i) => (
            <button key={i} onClick={() => { setSizeIdx(i); sfx.tap(); }} className={`text-[11px] rounded-full px-2.5 py-1 border transition ${i === sizeIdx ? "border-[var(--emerald)] text-[var(--emerald)] bg-[var(--emerald)]/10" : "border-foreground/10 text-muted-foreground"} ${lang === "ar" ? "font-arabic" : ""}`}>
              {lang === "ar" ? s.l : s.le}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => {
          addToCart({ id: `${cat}-${d.id}-${sizeIdx}`, name: lang === "ar" ? d.n : d.ne, price, variant: size ? (lang === "ar" ? size.l : size.le) : undefined, store, category: cat });
          sfx.add(); toast.success(t("added"));
        }}
        className={`mt-2 w-full bg-gradient-brand text-primary-foreground text-xs h-8 rounded-lg font-medium flex items-center justify-center gap-1 ${lang === "ar" ? "font-arabic" : ""}`}
      >
        <Plus className="h-3 w-3" /> {t("add_to_cart")}
      </button>
    </div>
  );
}

export function RestaurantsSection({ query = "" }: { query?: string }) {
  const { t, lang } = useSanadak();
  const q = query.trim().toLowerCase();
  const filtered = q
    ? restos.filter((r) => [r.n, r.ne, r.area, r.areae].some((s) => s.toLowerCase().includes(q)) || r.menu.some((d) => (d.n + d.ne).toLowerCase().includes(q)))
    : restos;
  return (
    <section id="restaurants" className="relative py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="01" ar={t("cat_restaurants")} en="Restaurants" title={t("cat_restaurants")} desc={t("cat_restaurants_desc")} />
        {filtered.length === 0 ? <EmptyState /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map((r) => <RestoCard key={r.id} r={r} />)}</div>
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  const { t, lang } = useSanadak();
  return (
    <div className={`glass-card rounded-3xl p-12 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("no_results")}</div>
  );
}

/* ---------- 2. Cafés ---------- */

type Cafe = { id: string; n: string; ne: string; area: string; areae: string; rating: number; color: string; drinks: { id: string; n: string; ne: string; p: number }[] };
const cafes: Cafe[] = [
  { id: "30north", n: "٣٠ نورث", ne: "30 North", area: "المعادي", areae: "Maadi", rating: 4.9, color: "bg-gradient-to-br from-amber-700 to-orange-800",
    drinks: [{ id: "v60", n: "في-٦٠", ne: "V60 pour over", p: 85 }, { id: "latte", n: "لاتيه مختص", ne: "Specialty latte", p: 70 }, { id: "cake", n: "تشيز كيك", ne: "Cheesecake", p: 95 }] },
  { id: "cilantro", n: "سيلانترو", ne: "Cilantro", area: "مدينة نصر", areae: "Nasr City", rating: 4.6, color: "bg-gradient-to-br from-emerald-700 to-teal-800",
    drinks: [{ id: "iced", n: "آيس لاتيه", ne: "Iced latte", p: 65 }, { id: "croissant", n: "كرواسون", ne: "Croissant", p: 45 }] },
  { id: "bake", n: "بيك أند بريك", ne: "Bake & Break", area: "الشيخ زايد", areae: "Sheikh Zayed", rating: 4.8, color: "bg-gradient-to-br from-pink-500 to-rose-600",
    drinks: [{ id: "moka", n: "موكا", ne: "Mocha", p: 80 }, { id: "donut", n: "دونتس مزجج", ne: "Glazed donut", p: 40 }] },
];

function CafeCard({ c }: { c: Cafe }) {
  const { lang, t, addBooking } = useSanadak();
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("19:00");
  const times = ["18:00", "19:00", "20:00", "21:00", "22:00"];

  const book = () => {
    const serial = generateSerial("CAFE");
    addBooking({ serial, type: "cafe", title: `${t("table_for")} ${guests} ${t("persons")}`, subtitle: lang === "ar" ? c.n : c.ne, time });
    openWhatsApp({
      type: "reservation", serial, storeName: lang === "ar" ? c.n : c.ne,
      lines: [`${t("table_for")} ${guests} ${t("persons")}`, `${t("time")}: ${time}`],
    }, lang);
    sfx.success(); toast.success(`${t("booked")} · ${serial}`);
  };

  return (
    <motion.div whileHover={{ y: -4 }} className="glass-card rounded-3xl p-5">
      <StoreHeader name={lang === "ar" ? c.n : c.ne} area={lang === "ar" ? c.area : c.areae} rating={c.rating} color={c.color} Icon={Coffee} />
      <div className="mt-4 space-y-1.5">
        {c.drinks.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-foreground/5 last:border-0">
            <span className={lang === "ar" ? "font-arabic" : ""}>{lang === "ar" ? d.n : d.ne}</span>
            <span className="font-semibold">{d.p} {t("sar")}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="glass-panel rounded-xl p-2">
          <div className={`text-[10px] text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("guests")}</div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => { setGuests(Math.max(1, guests - 1)); sfx.tap(); }} className="h-6 w-6 rounded-full bg-foreground/10 grid place-items-center">−</button>
            <span className="text-sm font-semibold">{guests}</span>
            <button onClick={() => { setGuests(guests + 1); sfx.tap(); }} className="h-6 w-6 rounded-full bg-foreground/10 grid place-items-center">+</button>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-2">
          <div className={`text-[10px] text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("time")}</div>
          <select value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none">
            {times.map((tm) => <option key={tm}>{tm}</option>)}
          </select>
        </div>
      </div>
      <button onClick={book} className={`mt-3 w-full bg-[#25D366] text-white h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
        <MessageCircle className="h-4 w-4" /> {t("book_table")}
      </button>
    </motion.div>
  );
}

export function CafesSection({ query = "" }: { query?: string }) {
  const { t } = useSanadak();
  const q = query.trim().toLowerCase();
  const filtered = q ? cafes.filter((c) => [c.n, c.ne, c.area, c.areae].some((s) => s.toLowerCase().includes(q))) : cafes;
  return (
    <section id="cafes" className="relative py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="02" ar={t("cat_cafes")} en="Cafés" title={t("cat_cafes")} desc={t("cat_cafes_desc")} />
        {filtered.length === 0 ? <EmptyState /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map((c) => <CafeCard key={c.id} c={c} />)}</div>
        )}
      </div>
    </section>
  );
}

/* ---------- 3. Shops & Fashion ---------- */

type Item = { id: string; n: string; ne: string; p: number; sizes: string[]; color: string };
const shopStores: { id: string; n: string; ne: string; items: Item[] }[] = [
  { id: "concrete", n: "كونكريت", ne: "Concrete", items: [
    { id: "tshirt", n: "تي شيرت قطن مصري", ne: "Egyptian cotton tee", p: 450, sizes: ["S", "M", "L", "XL"], color: "from-stone-300 to-stone-500" },
    { id: "jeans", n: "جينز سليم فيت", ne: "Slim fit jeans", p: 890, sizes: ["30", "32", "34", "36"], color: "from-blue-700 to-indigo-900" },
  ]},
  { id: "azza", n: "عزة فهمي", ne: "Azza Fahmy", items: [
    { id: "ring", n: "خاتم فضة منقوش", ne: "Engraved silver ring", p: 2400, sizes: ["6", "7", "8", "9"], color: "from-zinc-200 to-zinc-400" },
    { id: "neck", n: "قلادة ذهب", ne: "Gold pendant", p: 8900, sizes: ["40cm", "45cm"], color: "from-amber-300 to-yellow-500" },
  ]},
  { id: "mobaco", n: "موباكو", ne: "Mobaco", items: [
    { id: "polo", n: "بولو شيرت", ne: "Polo shirt", p: 620, sizes: ["S", "M", "L", "XL", "XXL"], color: "from-emerald-400 to-teal-600" },
    { id: "shoes", n: "حذاء جلد", ne: "Leather shoes", p: 1450, sizes: ["41", "42", "43", "44", "45"], color: "from-stone-700 to-stone-900" },
  ]},
];

function ShopItem({ it, store }: { it: Item; store: string }) {
  const { lang, t, addToCart } = useSanadak();
  const [size, setSize] = useState(it.sizes[0]);
  return (
    <div className="rounded-2xl border border-foreground/5 bg-background/40 overflow-hidden">
      <div className={`h-28 bg-gradient-to-br ${it.color}`} />
      <div className="p-3">
        <div className={`text-sm font-medium truncate ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? it.n : it.ne}</div>
        <div className="text-sm font-semibold text-[var(--emerald)] mt-0.5">{it.p.toLocaleString()} {t("sar")}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {it.sizes.map((s) => (
            <button key={s} onClick={() => { setSize(s); sfx.tap(); }} className={`text-[10px] h-6 w-9 rounded-md border transition ${size === s ? "border-[var(--emerald)] text-[var(--emerald)] bg-[var(--emerald)]/10" : "border-foreground/10 text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <button onClick={() => { addToCart({ id: `shop-${store}-${it.id}-${size}`, name: lang === "ar" ? it.n : it.ne, price: it.p, variant: `${t("size")} ${size}`, store, category: "shop" }); sfx.add(); toast.success(t("added")); }} className={`mt-2 w-full bg-gradient-brand text-primary-foreground text-[11px] h-7 rounded-md flex items-center justify-center gap-1 ${lang === "ar" ? "font-arabic" : ""}`}>
          <Plus className="h-3 w-3" /> {t("add_to_cart")}
        </button>
      </div>
    </div>
  );
}

export function ShopsSection({ query = "" }: { query?: string }) {
  const { t, lang } = useSanadak();
  const q = query.trim().toLowerCase();
  const filtered = q
    ? shopStores
        .map((s) => ({ ...s, items: s.items.filter((it) => (it.n + it.ne).toLowerCase().includes(q) || (s.n + s.ne).toLowerCase().includes(q)) }))
        .filter((s) => s.items.length > 0)
    : shopStores;
  return (
    <section id="shops" className="relative py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="03" ar={t("cat_shops")} en="Shops & Fashion" title={t("cat_shops")} desc={t("cat_shops_desc")} />
        {filtered.length === 0 ? <EmptyState /> : (
          <div className="space-y-8">
            {filtered.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card rounded-3xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center"><ShoppingBag className="h-4 w-4" /></div>
                  <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? s.n : s.ne}</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {s.items.map((it) => <ShopItem key={it.id} it={it} store={lang === "ar" ? s.n : s.ne} />)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- 4. Wedding Halls ---------- */

type Hall = { id: string; n: string; ne: string; area: string; areae: string; rating: number; cap: number; price: number; color: string };
const halls: Hall[] = [
  { id: "fairmont", n: "فيرمونت تاورز", ne: "Fairmont Towers", area: "هليوبوليس", areae: "Heliopolis", rating: 4.9, cap: 600, price: 180000, color: "bg-gradient-to-br from-amber-500 to-rose-600" },
  { id: "kempinski", n: "كمبينسكي نايل", ne: "Kempinski Nile", area: "جاردن سيتي", areae: "Garden City", rating: 4.95, cap: 350, price: 220000, color: "bg-gradient-to-br from-indigo-600 to-purple-700" },
  { id: "marriott", n: "ماريوت مينا هاوس", ne: "Marriott Mena House", area: "الأهرامات", areae: "Pyramids", rating: 4.85, cap: 800, price: 260000, color: "bg-gradient-to-br from-emerald-600 to-teal-700" },
];

function HallCard({ h }: { h: Hall }) {
  const { lang, t, addBooking } = useSanadak();
  const [guests, setGuests] = useState(200);
  const [date, setDate] = useState("");

  const reserve = () => {
    if (!date) { sfx.error(); toast.error(t("date")); return; }
    const serial = generateSerial("HALL");
    addBooking({ serial, type: "hall", title: lang === "ar" ? h.n : h.ne, subtitle: `${guests} ${t("guests")}`, day: date });
    openWhatsApp({
      type: "reservation", serial, storeName: lang === "ar" ? h.n : h.ne,
      lines: [`${t("date")}: ${date}`, `${t("guests")}: ${guests}`, `${t("starting_from")}: ${h.price.toLocaleString()} ${t("sar")}`],
    }, lang);
    sfx.success(); toast.success(`${t("booked")} · ${serial}`);
  };

  return (
    <motion.div whileHover={{ y: -6 }} className="glass-card rounded-3xl overflow-hidden">
      <div className={`h-36 ${h.color} relative`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className={`text-lg font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? h.n : h.ne}</div>
          <div className={`text-xs opacity-90 flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
            <MapPin className="h-3 w-3" /> {lang === "ar" ? h.area : h.areae}
            <span>·</span><Star className="h-3 w-3 fill-[var(--ember)] text-[var(--ember)]" /> {h.rating}
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={`flex items-center gap-1 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}><Users className="h-3.5 w-3.5" /> {t("capacity")}: {h.cap}</span>
          <span className="font-bold text-[var(--emerald)]">{h.price.toLocaleString()} {t("sar")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" />
          <input type="number" value={guests} min={50} step={50} onChange={(e) => setGuests(+e.target.value)} placeholder={t("guests")} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" />
        </div>
        <button onClick={reserve} className={`w-full bg-[#25D366] text-white h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
          <MessageCircle className="h-4 w-4" /> {t("book_hall")}
        </button>
      </div>
    </motion.div>
  );
}

export function HallsSection({ query = "" }: { query?: string }) {
  const { t } = useSanadak();
  const q = query.trim().toLowerCase();
  const filtered = q ? halls.filter((h) => [h.n, h.ne, h.area, h.areae].some((s) => s.toLowerCase().includes(q))) : halls;
  return (
    <section id="halls" className="relative py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="04" ar={t("cat_halls")} en="Wedding halls" title={t("cat_halls")} desc={t("cat_halls_desc")} />
        {filtered.length === 0 ? <EmptyState /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map((h) => <HallCard key={h.id} h={h} />)}</div>
        )}
      </div>
    </section>
  );
}

/* ---------- 5. Supermarket ---------- */

type GroceryItem = { id: string; n: string; ne: string; p: number; unit: string; unite: string; color: string };
const grocery: { cat: string; cate: string; items: GroceryItem[] }[] = [
  { cat: "خضار وفاكهة", cate: "Produce", items: [
    { id: "tomato", n: "طماطم", ne: "Tomatoes", p: 18, unit: "كيلو", unite: "kg", color: "from-red-400 to-rose-500" },
    { id: "potato", n: "بطاطس", ne: "Potatoes", p: 22, unit: "كيلو", unite: "kg", color: "from-yellow-600 to-amber-700" },
    { id: "mango", n: "مانجو عويس", ne: "Mango Owais", p: 95, unit: "كيلو", unite: "kg", color: "from-orange-400 to-yellow-500" },
  ]},
  { cat: "لحوم ودواجن", cate: "Meat & Poultry", items: [
    { id: "chicken", n: "دجاج بلدي", ne: "Free-range chicken", p: 165, unit: "كيلو", unite: "kg", color: "from-amber-200 to-orange-400" },
    { id: "beef", n: "لحم بقري", ne: "Beef", p: 420, unit: "كيلو", unite: "kg", color: "from-red-700 to-rose-900" },
  ]},
  { cat: "ألبان", cate: "Dairy", items: [
    { id: "milk", n: "لبن جهينة", ne: "Juhayna milk", p: 38, unit: "لتر", unite: "L", color: "from-blue-100 to-blue-300" },
    { id: "cheese", n: "جبنة رومي", ne: "Roumi cheese", p: 240, unit: "كيلو", unite: "kg", color: "from-yellow-300 to-amber-500" },
  ]},
];

function SuperSection() {
  const { t, lang, addToCart } = useSanadak();
export function SuperSection({ query = "" }: { query?: string }) {
  const { t, lang, addToCart } = useSanadak();
  const q = query.trim().toLowerCase();
  const filtered = q
    ? grocery
        .map((g) => ({ ...g, items: g.items.filter((it) => (it.n + it.ne + g.cat + g.cate).toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0)
    : grocery;
  return (
    <section id="super" className="relative py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="05" ar={t("cat_super")} en="Supermarket" title={t("cat_super")} desc={t("cat_super_desc")} />
        {filtered.length === 0 ? <EmptyState /> : (
        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center"><Cart className="h-5 w-5" /></div>
              <div>
                <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "سندك ماركت" : "Sanadak Market"}</div>
                <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}><Clock className="h-3 w-3 inline" /> {t("delivery_in")} 60 {t("minutes")}</div>
              </div>
            </div>
            <div className={`text-xs glass-panel rounded-full px-3 py-1 ${lang === "ar" ? "font-arabic" : ""}`}>{t("free_delivery")} 500 {t("sar")}</div>
          </div>
          {filtered.map((g) => (
            <div key={g.cat}>
              <div className={`text-sm font-semibold mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? g.cat : g.cate}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {g.items.map((it) => (
                  <div key={it.id} className="rounded-2xl border border-foreground/5 bg-background/40 overflow-hidden">
                    <div className={`h-20 bg-gradient-to-br ${it.color}`} />
                    <div className="p-3">
                      <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? it.n : it.ne}</div>
                      <div className={`text-[11px] text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{it.p} {t("sar")} / {lang === "ar" ? it.unit : it.unite}</div>
                      <button onClick={() => { addToCart({ id: `super-${it.id}`, name: lang === "ar" ? it.n : it.ne, price: it.p, variant: `1 ${lang === "ar" ? it.unit : it.unite}`, store: lang === "ar" ? "سندك ماركت" : "Sanadak Market", category: "supermarket" }); sfx.add(); toast.success(t("added")); }} className="mt-2 w-full bg-gradient-brand text-primary-foreground text-[11px] h-7 rounded-md flex items-center justify-center gap-1">
                        <Plus className="h-3 w-3" /> {t("add_to_cart")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}

/* ---------- 6. Pharmacy ---------- */

const meds = [
  { id: "panadol", n: "بنادول إكسترا", ne: "Panadol Extra", p: 28, color: "from-red-500 to-rose-700" },
  { id: "vitamin-c", n: "فيتامين سي ١٠٠٠", ne: "Vitamin C 1000", p: 145, color: "from-orange-400 to-amber-600" },
  { id: "thermometer", n: "ترمومتر رقمي", ne: "Digital thermometer", p: 220, color: "from-blue-500 to-indigo-700" },
  { id: "mask", n: "كمامات طبية (٥٠)", ne: "Medical masks (50)", p: 95, color: "from-emerald-400 to-teal-600" },
];

function PharmacySection() {
  const { t, lang, addToCart } = useSanadak();
  return (
    <section id="pharmacy" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="06" ar={t("cat_pharmacy")} en="Pharmacy" title={t("cat_pharmacy")} desc={t("cat_pharmacy_desc")} />
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white grid place-items-center"><Pill className="h-5 w-5" /></div>
            <div>
              <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "صيدلية العزبي" : "El Ezaby Pharmacy"}</div>
              <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>24/7 · {t("delivery_in")} 30 {t("minutes")}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {meds.map((m) => (
              <div key={m.id} className="rounded-2xl border border-foreground/5 bg-background/40 overflow-hidden">
                <div className={`h-24 bg-gradient-to-br ${m.color}`} />
                <div className="p-3">
                  <div className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? m.n : m.ne}</div>
                  <div className="text-sm font-semibold text-[var(--emerald)] mt-0.5">{m.p} {t("sar")}</div>
                  <button onClick={() => { addToCart({ id: `phar-${m.id}`, name: lang === "ar" ? m.n : m.ne, price: m.p, store: lang === "ar" ? "صيدلية العزبي" : "El Ezaby", category: "pharmacy" }); sfx.add(); toast.success(t("added")); }} className="mt-2 w-full bg-gradient-brand text-primary-foreground text-[11px] h-7 rounded-md flex items-center justify-center gap-1">
                    <Plus className="h-3 w-3" /> {t("add_to_cart")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 7. Medical bookings ---------- */

const doctors = [
  { id: "layla", n: "د. ليلى الحربي", ne: "Dr. Layla Al-Harbi", s: "أمراض قلب · دار الفؤاد", se: "Cardiology · Dar Al Fouad", fee: 600, color: "bg-gradient-to-br from-rose-500 to-red-600" },
  { id: "ahmed", n: "د. أحمد فؤاد", ne: "Dr. Ahmed Fouad", s: "أطفال · مستشفى السلام", se: "Pediatrics · As-Salam Hospital", fee: 450, color: "bg-gradient-to-br from-blue-500 to-indigo-600" },
  { id: "mona", n: "د. منى صلاح", ne: "Dr. Mona Salah", s: "جلدية · كليوباترا", se: "Dermatology · Cleopatra", fee: 550, color: "bg-gradient-to-br from-pink-500 to-rose-600" },
];

function DoctorCard({ d }: { d: typeof doctors[number] }) {
  const { lang, t, addBooking } = useSanadak();
  const days = lang === "ar" ? ["إث", "ثل", "أر", "خم", "جم", "سب", "أح"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const slots = ["09:00","11:00","13:00","16:00","18:00"];
  const [dayIdx, setDayIdx] = useState(2);
  const [slot, setSlot] = useState(slots[1]);

  const book = () => {
    const serial = generateSerial("MED");
    const day = `${days[dayIdx]} ${12 + dayIdx}`;
    addBooking({ serial, type: "medical", title: lang === "ar" ? d.n : d.ne, subtitle: lang === "ar" ? d.s : d.se, day, time: slot });
    openWhatsApp({
      type: "booking", serial, storeName: lang === "ar" ? d.n : d.ne,
      lines: [lang === "ar" ? d.s : d.se, `${t("date")}: ${day}`, `${t("time")}: ${slot}`, `${t("total")}: ${d.fee} ${t("sar")}`],
    }, lang);
    sfx.success(); toast.success(`${t("booked")} · ${serial}`);
  };

  return (
    <motion.div whileHover={{ y: -4 }} className="glass-card rounded-3xl p-5">
      <StoreHeader name={lang === "ar" ? d.n : d.ne} area={lang === "ar" ? d.s : d.se} rating={4.9} color={d.color} Icon={Stethoscope} />
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <button key={i} onClick={() => { setDayIdx(i); sfx.tap(); }} className={`rounded-xl py-2 text-center text-[11px] border transition ${i === dayIdx ? "bg-gradient-brand text-primary-foreground border-transparent" : "border-foreground/5 bg-background/40"}`}>
            <div className={`opacity-70 ${lang === "ar" ? "font-arabic" : ""}`}>{day}</div>
            <div className="font-semibold">{12 + i}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {slots.map((s) => (
          <button key={s} onClick={() => { setSlot(s); sfx.tap(); }} className={`text-xs px-3 py-1.5 rounded-lg border transition ${slot === s ? "border-[var(--emerald)] text-[var(--emerald)] bg-[var(--emerald)]/10" : "border-foreground/10 text-muted-foreground"}`}>{s}</button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={`text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("starting_from")} <span className="font-bold text-foreground">{d.fee} {t("sar")}</span></span>
      </div>
      <button onClick={book} className={`mt-3 w-full bg-[#25D366] text-white h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
        <MessageCircle className="h-4 w-4" /> {t("book_now")}
      </button>
    </motion.div>
  );
}

function MedicalSection() {
  const { t } = useSanadak();
  return (
    <section id="medical" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHead idx="07" ar={t("nav_health")} en="Medical bookings" title={t("health_title")} desc={t("health_desc")} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{doctors.map((d) => <DoctorCard key={d.id} d={d} />)}</div>
      </div>
    </section>
  );
}

/* ---------- Wrapper ---------- */

export function CategoriesShowcase() {
  const { t, lang } = useSanadak();
  return (
    <div id="categories" className="relative">
      <div className="text-center max-w-2xl mx-auto pt-20 px-4">
        <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-[var(--emerald)]" />
          <span className={lang === "ar" ? "font-arabic" : ""}>{t("sec_categories_title")}</span>
        </div>
        <h2 className={`mt-5 text-4xl md:text-6xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
          {t("headline_a")} <span className="text-gradient-brand">{t("headline_b")}</span>
        </h2>
        <p className={`mt-3 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("sec_categories_sub")}</p>
      </div>
      <RestaurantsSection />
      <CafesSection />
      <ShopsSection />
      <HallsSection />
      <SuperSection />
      <PharmacySection />
      <MedicalSection />
    </div>
  );
}
