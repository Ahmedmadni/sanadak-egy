import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

type Lang = "ar" | "en";

export type CartItem = { id: string; name: string; price: number; qty: number };
export type Booking = { id: string; doctor: string; specialty: string; day: string; time: string };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof typeof dict["ar"]) => string;
  dir: "rtl" | "ltr";
  cart: CartItem[];
  addToCart: (i: Omit<CartItem, "qty">) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  bookings: Booking[];
  addBooking: (b: Omit<Booking, "id">) => void;
  cancelBooking: (id: string) => void;
  cartOpen: boolean;
  setCartOpen: (b: boolean) => void;
  merchantOpen: boolean;
  setMerchantOpen: (b: boolean) => void;
};

const dict = {
  ar: {
    brand_tag: "منصة مصرية ذكية · متاحة الآن",
    nav_services: "الخدمات",
    nav_food: "طعام",
    nav_health: "صحة",
    nav_shopping: "تسوق",
    nav_track: "تتبع",
    nav_merchant: "أضف متجري",
    cta_start: "ابدأ الآن",
    cta_explore: "اكتشف الخدمات",
    hero_h1_a: "كل خدماتك في",
    hero_h1_b: "مكان واحد",
    hero_sub: "بوابتك الذكية لكل ما تحتاجه — طعام، صحة، تسوق، وتوصيل — في تطبيق فاخر واحد يجمع كل شيء.",
    users: "أكثر من ٥٠٠ ألف مستخدم",
    rating: "٤.٩ · آب ستور",
    cities: "القاهرة · الإسكندرية · الجيزة",
    section_ar: "منظومة سندك",
    section_en: "منظومة متكاملة",
    headline_a: "تطبيق واحد.",
    headline_b: "كل الخدمات.",
    headline_sub: "خمس تجارب مصممة بدقة، تعمل معاً كأنها واحدة — مدعومة بذكاءٍ يفهم احتياجك.",
    learn_more: "اعرف أكثر",
    add_to_cart: "أضف إلى السلة",
    book_now: "احجز الآن",
    cart: "السلة",
    cart_empty: "السلة فارغة",
    bookings: "حجوزاتي",
    no_bookings: "لا توجد حجوزات بعد",
    total: "الإجمالي",
    checkout: "إتمام الطلب",
    remove: "حذف",
    cancel: "إلغاء",
    merchant_title: "أضف متجرك إلى سندك",
    merchant_sub: "هل تملك متجراً أو خدمة؟ انضم إلى منظومة سندك ووسّع وصولك إلى آلاف العملاء في مصر.",
    merchant_call: "اتصل بنا الآن",
    merchant_or: "أو املأ النموذج",
    store_name: "اسم المتجر",
    owner_name: "اسم المالك",
    phone: "رقم الهاتف",
    category: "نوع النشاط",
    submit: "إرسال الطلب",
    submitted: "تم استلام طلبك! سنتواصل معك خلال ٢٤ ساعة.",
    booked: "تم تأكيد حجزك",
    added: "تمت الإضافة إلى السلة",
    download_ios: "حمّل لـ iOS",
    download_android: "حمّل لـ Android",
    cta_final_a: "ابدأ رحلتك مع",
    cta_final_sub: "انضم إلى مئات الآلاف من المستخدمين الذين يعيشون بذكاءٍ أكبر في مصر.",
    footer_rights: "© ٢٠٢٦ سندك · جميع الحقوق محفوظة",
    privacy: "الخصوصية",
    terms: "الشروط",
    contact: "تواصل معنا",
    sar: "ج.م",
    food_title: "طعام بمستوى المطاعم، يصل في دقائق",
    food_desc: "قوائم منتقاة من ألمع المطابخ في مصر، مع وقت توصيل مباشر وتجربة دفع أنيقة.",
    health_title: "احجز الطبيب المناسب في أقل من دقيقة",
    health_desc: "تصفح الأخصائيين، شاهد المواعيد المتاحة، وأكّد حجزك فوراً. التأمين والملفات والتذكيرات في مكان واحد.",
    shop_title: "متجر يفهم ذوقك",
    shop_desc: "علامات تجارية مميزة، حرفيون محليون، وعروض حصرية — في واجهة متجر منسقة بدقة.",
    track_title: "تابع طلبك في كل خطوة",
    track_desc: "نظام لوجستي ذكي بمسارات محدثة وأوقات وصول دقيقة، حتى لا تبقى في انتظار.",
    hub_title: "سوبر-آب موحّد، مصمم ليختفي خلف بساطته",
    hub_desc: "كل احتياجاتك في واجهة هادئة وذكية. سندك يقترح الخطوة التالية قبل أن تبحث عنها.",
    confirm_booking: "تأكيد الموعد",
    insurance: "مغطى بالتأمين",
    flash_sale: "تخفيضات سريعة",
    ends_in: "ينتهي خلال",
    eta: "وقت الوصول",
    picked: "تم الاستلام",
    in_transit: "قيد التوصيل",
    delivered: "تم التسليم",
    delivering_to: "التوصيل إلى",
    cairo_area: "القاهرة، الزمالك",
    ai_suggest: "اقتراحات ذكية",
    based_on: "حسب نشاطك هذا الأسبوع",
    suggestion: "احجز موعداً مع طبيب + أعد طلب القهوة",
    apply: "تطبيق",
    super_app: "مركز السوبر-آب",
    marketplace: "السوق",
    curated: "منتقى لك",
    live_tracking: "تتبع مباشر",
    courier: "المندوب · أحمد",
    away: "كم متبقي",
    order: "طلب رقم",
    out_for_delivery: "في الطريق إليك",
  },
  en: {
    brand_tag: "Smart Egyptian platform · Now live",
    nav_services: "Services",
    nav_food: "Food",
    nav_health: "Health",
    nav_shopping: "Shopping",
    nav_track: "Track",
    nav_merchant: "Add my store",
    cta_start: "Get started",
    cta_explore: "Explore services",
    hero_h1_a: "All your services in",
    hero_h1_b: "one place",
    hero_sub: "Your smart gateway to everything you need — food, health, shopping, and delivery — unified in one elegant super-app.",
    users: "500K+ users",
    rating: "4.9 · App Store",
    cities: "Cairo · Alexandria · Giza",
    section_ar: "The Sanadak ecosystem",
    section_en: "Ecosystem",
    headline_a: "One app.",
    headline_b: "Every service.",
    headline_sub: "Five experiences crafted with precision, working as one — powered by intelligence that understands your needs.",
    learn_more: "Learn more",
    add_to_cart: "Add to cart",
    book_now: "Book now",
    cart: "Cart",
    cart_empty: "Your cart is empty",
    bookings: "My bookings",
    no_bookings: "No bookings yet",
    total: "Total",
    checkout: "Checkout",
    remove: "Remove",
    cancel: "Cancel",
    merchant_title: "Add your store to Sanadak",
    merchant_sub: "Own a store or service? Join the Sanadak ecosystem and reach thousands of customers across Egypt.",
    merchant_call: "Call us now",
    merchant_or: "Or fill the form",
    store_name: "Store name",
    owner_name: "Owner name",
    phone: "Phone number",
    category: "Business type",
    submit: "Submit request",
    submitted: "Request received! We'll contact you within 24 hours.",
    booked: "Booking confirmed",
    added: "Added to cart",
    download_ios: "Download for iOS",
    download_android: "Download for Android",
    cta_final_a: "Start your journey with",
    cta_final_sub: "Join hundreds of thousands of users already living smarter across Egypt.",
    footer_rights: "© 2026 Sanadak · All rights reserved",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    sar: "EGP",
    food_title: "Restaurant-grade taste, delivered in minutes",
    food_desc: "Curated menus from premium kitchens across Egypt, with live ETA and a checkout that feels native.",
    health_title: "Book the right doctor — in under a minute",
    health_desc: "Browse specialists, view live availability, and confirm instantly. Insurance, records and reminders, all in one place.",
    shop_title: "A marketplace that learns your taste",
    shop_desc: "Premium brands, local artisans, and exclusive drops — assembled into a beautifully curated storefront.",
    track_title: "Watch every order glide to your door",
    track_desc: "Real-time logistics with intelligent routing and proactive ETAs, so you're never left guessing.",
    hub_title: "A connected super-app, designed to disappear",
    hub_desc: "All your essentials unified into one quiet, intelligent interface that suggests what's next.",
    confirm_booking: "Confirm appointment",
    insurance: "Insurance covered",
    flash_sale: "Flash sale",
    ends_in: "Ends in",
    eta: "ETA",
    picked: "Picked",
    in_transit: "In transit",
    delivered: "Delivered",
    delivering_to: "Delivering to",
    cairo_area: "Cairo, Zamalek",
    ai_suggest: "AI suggestions",
    based_on: "Based on your week",
    suggestion: "Book a clinic visit + reorder coffee",
    apply: "Apply",
    super_app: "Super-app hub",
    marketplace: "Marketplace",
    curated: "Curated for you",
    live_tracking: "Live tracking",
    courier: "Courier · Ahmed",
    away: "km away",
    order: "Order #",
    out_for_delivery: "Out for delivery",
  },
} as const;

const SanadakCtx = createContext<Ctx | null>(null);

export function SanadakProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("sanadak");
    if (s) {
      try {
        const p = JSON.parse(s);
        if (p.lang) setLangState(p.lang);
        if (p.cart) setCart(p.cart);
        if (p.bookings) setBookings(p.bookings);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sanadak", JSON.stringify({ lang, cart, bookings }));
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang, cart, bookings]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: setLangState,
    t: (k) => dict[lang][k] ?? String(k),
    dir: lang === "ar" ? "rtl" : "ltr",
    cart,
    addToCart: (i) =>
      setCart((c) => {
        const ex = c.find((x) => x.id === i.id);
        if (ex) return c.map((x) => (x.id === i.id ? { ...x, qty: x.qty + 1 } : x));
        return [...c, { ...i, qty: 1 }];
      }),
    removeFromCart: (id) => setCart((c) => c.filter((x) => x.id !== id)),
    clearCart: () => setCart([]),
    bookings,
    addBooking: (b) => setBookings((bs) => [...bs, { ...b, id: crypto.randomUUID() }]),
    cancelBooking: (id) => setBookings((bs) => bs.filter((b) => b.id !== id)),
    cartOpen, setCartOpen,
    merchantOpen, setMerchantOpen,
  }), [lang, cart, bookings, cartOpen, merchantOpen]);

  return <SanadakCtx.Provider value={value}>{children}</SanadakCtx.Provider>;
}

export function useSanadak() {
  const c = useContext(SanadakCtx);
  if (!c) throw new Error("useSanadak must be used within SanadakProvider");
  return c;
}
