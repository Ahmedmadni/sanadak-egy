import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Store, MapPin, Phone, Star, BadgeCheck, ArrowLeft, ArrowRight,
  ShoppingBag, CalendarCheck, Send, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { categoryConfig } from "@/components/business/types";

export const Route = createFileRoute("/store/$slug")({
  head: () => ({ meta: [{ title: "سندك" }] }),
  component: StorePage,
});

type Tenant = {
  id: string; slug: string; name: string; category: string; area: string | null; phone: string | null;
  description: string | null; image_url: string | null; cover_url: string | null; verified_at: string | null;
};
type Item = {
  id: string; name: string; description: string | null; price: number; currency: string;
  image_url: string | null; duration_minutes: number | null; stock: number | null;
};
type Review = { id: string; rating: number; body: string | null; created_at: string };

function StorePage() {
  const { slug } = Route.useParams();
  const { lang, dir, customer, setCustomer } = useSanadak();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Item | null>(null);
  const [slotAt, setSlotAt] = useState("");
  const [busy, setBusy] = useState(false);
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from("tenants").select("*").eq("slug", slug).maybeSingle();
      if (t) {
        setTenant(t);
        const [{ data: i }, { data: r }] = await Promise.all([
          supabase.from("catalog_items").select("*").eq("tenant_id", t.id).eq("is_active", true).order("sort_order"),
          supabase.from("reviews").select("*").eq("tenant_id", t.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(10),
        ]);
        setItems(i ?? []);
        setReviews(r ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <main className="min-h-screen grid place-items-center"><div className="text-sm text-muted-foreground">...</div></main>;

  if (!tenant) {
    return (
      <main className="min-h-screen grid place-items-center px-4 pt-24">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center">
          <Store className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className={`mt-3 text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "المتجر غير متاح" : "Store unavailable"}</h1>
          <Link to="/search" search={{ q: "" }} className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--emerald)]"><Arrow className="h-4 w-4" /> {lang === "ar" ? "العودة للبحث" : "Back to search"}</Link>
        </div>
      </main>
    );
  }

  const cfg = categoryConfig(tenant.category);
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!customer.name || !customer.phone) {
      toast.error(lang === "ar" ? "يرجى إدخال الاسم ورقم الهاتف" : "Please enter name and phone");
      return;
    }
    setBusy(true);
    try {
      if (cfg.hasBookings && active.duration_minutes) {
        const startsAt = new Date(slotAt);
        if (!slotAt || Number.isNaN(startsAt.getTime())) {
          throw new Error(lang === "ar" ? "يرجى اختيار موعد صحيح" : "Please choose a valid booking time");
        }

        const { error } = await supabase.rpc("create_booking", {
          _tenant: tenant.id,
          _item: active.id,
          _slot_start: startsAt.toISOString(),
          _customer_name: customer.name,
          _customer_phone: customer.phone,
          _branch: null,
          _staff: null,
          _notes: null,
        });
        if (error) throw error;
        sfx.success();
        toast.success(lang === "ar" ? "تم إرسال طلب الحجز" : "Booking request sent");
      } else {
        const { error } = await supabase.rpc("create_order", {
          _tenant: tenant.id,
          _items: [{ item_id: active.id, qty: 1, variants: {} }],
          _customer_name: customer.name,
          _customer_phone: customer.phone,
          _customer_address: customer.address || null,
          _delivery_type: customer.address ? "delivery" : "pickup",
          _notes: null,
        });
        if (error) throw error;
        sfx.success();
        toast.success(lang === "ar" ? "تم إرسال طلبك" : "Order sent");
      }
      setActive(null);
      setSlotAt("");
    } catch (err) {
      const message = (err as Error).message || "";
      if (message.includes("selected time is no longer available")) {
        toast.error(lang === "ar" ? "هذا الموعد لم يعد متاحًا، اختر موعدًا آخر" : "That time is no longer available. Please choose another slot.");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen pt-28 pb-20">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none opacity-60" />
      <div className="relative max-w-4xl mx-auto px-4">
        <Link to="/search" search={{ q: "" }} className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition ${lang === "ar" ? "font-arabic" : ""}`}>
          <Arrow className="h-4 w-4" /> {lang === "ar" ? "البحث" : "Search"}
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 glass-card rounded-3xl p-6 flex flex-wrap items-start gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
            {tenant.image_url ? <img src={tenant.image_url} className="h-full w-full object-cover" /> : <Store className="h-7 w-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-2xl font-bold flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
              {tenant.name}
              {tenant.verified_at && <BadgeCheck className="h-5 w-5 text-[var(--emerald)]" />}
            </div>
            <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-3">
              <span>{lang === "ar" ? cfg.labelAr : cfg.labelEn}</span>
              {tenant.area && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {tenant.area}</span>}
              {tenant.phone && <span dir="ltr" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {tenant.phone}</span>}
              {avgRating && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[var(--ember)] text-[var(--ember)]" /> {avgRating} ({reviews.length})</span>}
            </div>
            {tenant.description && <p className={`mt-3 text-sm text-foreground/80 ${lang === "ar" ? "font-arabic" : ""}`}>{tenant.description}</p>}
          </div>
        </motion.div>

        <h2 className={`mt-8 text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? cfg.catalogLabelAr : cfg.catalogLabelEn}</h2>
        {items.length === 0 ? (
          <div className={`mt-4 glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "لم يضف هذا النشاط عناصر بعد." : "This business hasn't added items yet."}
          </div>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {items.map((it) => (
              <div key={it.id} className="glass-card rounded-2xl p-4 flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
                  {it.image_url ? <img src={it.image_url} className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{it.name}</div>
                  {it.description && <p className={`text-xs text-muted-foreground mt-0.5 line-clamp-2 ${lang === "ar" ? "font-arabic" : ""}`}>{it.description}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold">{it.price} {it.currency}</span>
                    <button onClick={() => { setActive(it); sfx.open(); }} className="h-8 px-3 rounded-full bg-gradient-brand text-primary-foreground text-xs font-medium shadow-glow flex items-center gap-1">
                      {cfg.hasBookings && it.duration_minutes ? <CalendarCheck className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                      {cfg.hasBookings && it.duration_minutes ? (lang === "ar" ? "احجز" : "Book") : (lang === "ar" ? "اطلب" : "Order")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <>
            <h2 className={`mt-10 text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "آراء العملاء" : "Customer reviews"}</h2>
            <div className="mt-4 grid gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`} />)}
                  </div>
                  {r.body && <p className={`mt-2 text-sm ${lang === "ar" ? "font-arabic" : ""}`}>{r.body}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setActive(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submitOrder} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-md shadow-float">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{active.name}</h2>
              <button type="button" onClick={() => setActive(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3">
              <input required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder={lang === "ar" ? "اسمك" : "Your name"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder={lang === "ar" ? "رقم الهاتف" : "Phone"} dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              {cfg.hasBookings && active.duration_minutes ? (
                <input type="datetime-local" required value={slotAt} onChange={(e) => setSlotAt(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" dir="ltr" />
              ) : (
                <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder={lang === "ar" ? "عنوان التوصيل (اختياري)" : "Delivery address (optional)"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              )}
            </div>
            <button disabled={busy} type="submit" className="mt-5 w-full h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="h-4 w-4" /> {lang === "ar" ? "تأكيد" : "Confirm"}
            </button>
          </motion.form>
        </div>
      )}
    </main>
  );
}
