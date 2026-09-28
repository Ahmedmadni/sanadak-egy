import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

type Lang = "ar" | "en";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  variant?: string;
  store?: string;
  category?: string;
};
export type Booking = {
  id: string;
  serial: string;
  type: "medical" | "hall" | "cafe" | "restaurant";
  title: string;
  subtitle: string;
  day?: string;
  time?: string;
  guests?: number;
};

export type Customer = { name: string; phone: string; address: string };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
  dir: "rtl" | "ltr";
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  cart: CartItem[];
  addToCart: (i: Omit<CartItem, "qty">) => void;
  removeFromCart: (id: string, variant?: string) => void;
  clearCart: () => void;
  bookings: Booking[];
  addBooking: (b: Omit<Booking, "id">) => void;
  cancelBooking: (id: string) => void;
  cartOpen: boolean;
  setCartOpen: (b: boolean) => void;
  merchantOpen: boolean;
  setMerchantOpen: (b: boolean) => void;
  assistantOpen: boolean;
  setAssistantOpen: (b: boolean) => void;
  customer: Customer;
  setCustomer: (c: Customer) => void;
  sound: boolean;
  setSound: (b: boolean) => void;
};

const dict: Record<Lang, Record<string, string>> = {
  ar: {
    brand_tag: "منصة مصرية ذكية · متاحة الآن",
    nav_services: "الخدمات",
    nav_categories: "الأقسام",
    nav_food: "مطاعم",
    nav_cafes: "كافيهات",
    nav_shops: "محلات",
    nav_halls: "قاعات أفراح",
    nav_super: "سوبرماركت",
    nav_pharmacy: "صيدليات",
    nav_health: "طبي",
    nav_shopping: "تسوق",
    nav_track: "تتبع",
    nav_merchant: "أضف متجري",
    cta_start: "ابدأ الآن",
    cta_explore: "اكتشف الخدمات",
    hero_h1_a: "كل خدماتك في",
    hero_h1_b: "مكان واحد",
    hero_sub: "بوابتك الذكية لكل ما تحتاجه — طعام، صحة، تسوق، أفراح، وتوصيل — في تطبيق فاخر واحد يجمع كل شيء، وحجوزات فورية عبر واتساب.",
    users: "أكثر من ٥٠٠ ألف مستخدم",
    rating: "٤.٩ · آب ستور",
    cities: "القاهرة · الإسكندرية · الجيزة",
    section_ar: "منظومة سندك",
    section_en: "منظومة متكاملة",
    headline_a: "تطبيق واحد.",
    headline_b: "كل الخدمات.",
    headline_sub: "اختر نشاطك التجاري، اطلب أو احجز فوراً، ويصلك التأكيد على واتساب برقم تسلسلي مميز.",
    learn_more: "اعرف أكثر",
    add_to_cart: "أضف للسلة",
    book_now: "احجز عبر واتساب",
    order_wa: "اطلب عبر واتساب",
    reserve_wa: "احجز عبر واتساب",
    cart: "السلة",
    cart_empty: "السلة فارغة",
    bookings: "حجوزاتي",
    no_bookings: "لا توجد حجوزات بعد",
    total: "الإجمالي",
    checkout: "إتمام الطلب عبر واتساب",
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
    submitted: "تم إرسال الطلب على واتساب",
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
    serial_label: "رقم الطلب",
    name_placeholder: "اسمك بالكامل",
    phone_placeholder: "رقم الواتساب",
    address_placeholder: "عنوان التوصيل",
    notes_placeholder: "ملاحظات إضافية (اختياري)",
    food_title: "طعام بمستوى المطاعم، يصل في دقائق",
    food_desc: "قوائم منتقاة من ألمع المطابخ في مصر، مع توصيل مباشر وحجز فوري عبر واتساب.",
    health_title: "احجز الطبيب المناسب في أقل من دقيقة",
    health_desc: "تصفح الأخصائيين، شاهد المواعيد المتاحة، وأكّد حجزك فوراً عبر واتساب.",
    shop_title: "متجر يفهم ذوقك",
    shop_desc: "علامات تجارية مميزة، حرفيون محليون، وعروض حصرية — توصيل لكل أنحاء مصر.",
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
    delivery_fee: "رسوم التوصيل",
    free_delivery: "توصيل مجاني للطلبات فوق",
    pickup: "استلام من المتجر",
    delivery: "توصيل للمنزل",
    size: "المقاس",
    qty: "الكمية",
    select_size: "اختر المقاس",
    select_variant: "اختر النوع",
    guests: "عدد المدعوين",
    date: "التاريخ",
    time: "الوقت",
    table_for: "حجز طاولة لـ",
    persons: "أشخاص",
    sec_categories_title: "أقسام سندك",
    sec_categories_sub: "كل نشاط تجاري في قسمه الخاص — اختر، اطلب أو احجز، يصلك التأكيد على واتساب فوراً.",
    cat_restaurants: "المطاعم",
    cat_restaurants_desc: "أشهى الأطباق من مطاعم مصر، قوائم كاملة بالأصناف والأحجام والأسعار",
    cat_cafes: "الكافيهات",
    cat_cafes_desc: "قهوة مختصة، حلويات، ومشروبات باردة — احجز طاولتك أو اطلب توصيل",
    cat_shops: "المحلات والأزياء",
    cat_shops_desc: "ملابس، أحذية، إكسسوارات بمقاسات متعددة وعلامات مختارة",
    cat_halls: "قاعات الأفراح",
    cat_halls_desc: "احجز قاعتك المثالية — قاعات فاخرة في القاهرة والإسكندرية والجيزة",
    cat_super: "السوبرماركت",
    cat_super_desc: "خضار، فاكهة، لحوم، ومنتجات يومية — يوصلك في ساعة",
    cat_pharmacy: "الصيدليات",
    cat_pharmacy_desc: "أدوية، فيتامينات، ومستلزمات صحية — توصيل سريع ٢٤/٧",
    menu: "القائمة",
    book_table: "حجز طاولة",
    book_hall: "حجز القاعة",
    order_now: "اطلب الآن",
    capacity: "السعة",
    night: "الليلة",
    starting_from: "يبدأ من",
    open_now: "مفتوح الآن",
    closes_at: "يُغلق",
    min_order: "أقل طلب",
    delivery_in: "التوصيل خلال",
    minutes: "دقيقة",
    customer_info: "بيانات التوصيل",
    needs_info: "أكمل بيانات التوصيل لإتمام الطلب",
    sound_on: "الصوت مفعل",
    sound_off: "الصوت مكتوم",
    search_placeholder: "ابحث في هذا القسم...",
    back_home: "الرئيسية",
    no_results: "لا توجد نتائج مطابقة",
    explore_all: "استكشف كل الأقسام",
    visit_section: "ادخل القسم",
    open_assistant: "مساعد سندك الذكي",
    assistant_title: "مساعد سندك",
    assistant_welcome: "أهلاً بك! أنا مساعد سندك. اسألني عن أي خدمة وأرشدك للقسم المناسب فوراً.",
    assistant_placeholder: "اكتب طلبك... مثال: عايز أحجز دكتور أطفال",
    assistant_send: "إرسال",
    assistant_open_section: "افتح القسم",
    quick_suggestions: "اقتراحات سريعة",
    filter: "فلترة",
    cinematic_intro: "عروض سينمائية لكل قسم — اختر واستكشف",

  },
  en: {
    brand_tag: "Smart Egyptian platform · Now live",
    nav_services: "Services",
    nav_categories: "Categories",
    nav_food: "Restaurants",
    nav_cafes: "Cafés",
    nav_shops: "Shops",
    nav_halls: "Wedding halls",
    nav_super: "Supermarket",
    nav_pharmacy: "Pharmacy",
    nav_health: "Medical",
    nav_shopping: "Shopping",
    nav_track: "Track",
    nav_merchant: "Add my store",
    cta_start: "Get started",
    cta_explore: "Explore services",
    hero_h1_a: "All your services in",
    hero_h1_b: "one place",
    hero_sub: "Your smart gateway to everything you need — food, health, shopping, weddings, and delivery — with instant WhatsApp confirmations.",
    users: "500K+ users",
    rating: "4.9 · App Store",
    cities: "Cairo · Alexandria · Giza",
    section_ar: "The Sanadak ecosystem",
    section_en: "Ecosystem",
    headline_a: "One app.",
    headline_b: "Every service.",
    headline_sub: "Pick a business, order or book instantly, and get confirmation on WhatsApp with a unique serial number.",
    learn_more: "Learn more",
    add_to_cart: "Add to cart",
    book_now: "Book via WhatsApp",
    order_wa: "Order via WhatsApp",
    reserve_wa: "Reserve via WhatsApp",
    cart: "Cart",
    cart_empty: "Your cart is empty",
    bookings: "My bookings",
    no_bookings: "No bookings yet",
    total: "Total",
    checkout: "Checkout via WhatsApp",
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
    submitted: "Sent to WhatsApp",
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
    serial_label: "Order #",
    name_placeholder: "Full name",
    phone_placeholder: "WhatsApp number",
    address_placeholder: "Delivery address",
    notes_placeholder: "Additional notes (optional)",
    food_title: "Restaurant-grade taste, delivered in minutes",
    food_desc: "Curated menus, live delivery, instant WhatsApp confirmations.",
    health_title: "Book the right doctor — in under a minute",
    health_desc: "Browse specialists, view availability, confirm instantly via WhatsApp.",
    shop_title: "A marketplace that learns your taste",
    shop_desc: "Premium brands and local artisans, delivered across Egypt.",
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
    delivery_fee: "Delivery fee",
    free_delivery: "Free delivery for orders above",
    pickup: "Pickup",
    delivery: "Home delivery",
    size: "Size",
    qty: "Qty",
    select_size: "Choose size",
    select_variant: "Choose variant",
    guests: "Guests",
    date: "Date",
    time: "Time",
    table_for: "Table for",
    persons: "people",
    sec_categories_title: "Sanadak categories",
    sec_categories_sub: "Each business in its own section — order or book, get instant WhatsApp confirmation.",
    cat_restaurants: "Restaurants",
    cat_restaurants_desc: "Top Egyptian restaurants with full menus, variants and prices",
    cat_cafes: "Cafés",
    cat_cafes_desc: "Specialty coffee, pastries, cold drinks — book or order",
    cat_shops: "Shops & Fashion",
    cat_shops_desc: "Clothing, shoes, accessories — multiple sizes and brands",
    cat_halls: "Wedding halls",
    cat_halls_desc: "Reserve your perfect venue — luxury halls in Cairo, Alexandria, Giza",
    cat_super: "Supermarket",
    cat_super_desc: "Groceries and daily essentials — delivered in an hour",
    cat_pharmacy: "Pharmacy",
    cat_pharmacy_desc: "Medicines, vitamins and care — fast 24/7 delivery",
    menu: "Menu",
    book_table: "Book a table",
    book_hall: "Reserve hall",
    order_now: "Order now",
    capacity: "Capacity",
    night: "night",
    starting_from: "from",
    open_now: "Open now",
    closes_at: "Closes",
    min_order: "Min. order",
    delivery_in: "Delivery in",
    minutes: "min",
    customer_info: "Delivery details",
    needs_info: "Please complete your delivery details to checkout",
    sound_on: "Sound on",
    sound_off: "Sound off",
    search_placeholder: "Search this section...",
    back_home: "Home",
    no_results: "No matching results",
    explore_all: "Explore all categories",
    visit_section: "Enter section",
    open_assistant: "Sanadak AI Assistant",
    assistant_title: "Sanadak Assistant",
    assistant_welcome: "Hi! I'm Sanadak's assistant. Ask me about any service and I'll guide you to the right section instantly.",
    assistant_placeholder: "Type what you need... e.g. book a pediatrician",
    assistant_send: "Send",
    assistant_open_section: "Open section",
    quick_suggestions: "Quick suggestions",
    filter: "Filter",
    cinematic_intro: "Cinematic previews for every section — pick and explore",
  },
};

const SanadakCtx = createContext<Ctx | null>(null);

export function SanadakProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [customer, setCustomerState] = useState<Customer>({ name: "", phone: "", address: "" });
  const [sound, setSoundState] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const s = localStorage.getItem("sanadak");
    if (s) {
      try {
        const p = JSON.parse(s);
        if (p.lang) setLangState(p.lang);
        if (p.cart) setCart(p.cart);
        if (p.bookings) setBookings(p.bookings);
        if (p.customer) setCustomerState(p.customer);
        if (typeof p.sound === "boolean") setSoundState(p.sound);
      } catch {
        // Ignore malformed legacy localStorage state and keep safe defaults.
      }
    }
    const savedTheme = localStorage.getItem("sanadak_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setThemeState(savedTheme);
    } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sanadak", JSON.stringify({ lang, cart, bookings, customer, sound }));
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("sanadak_sound", sound ? "1" : "0");
  }, [lang, cart, bookings, customer, sound]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sanadak_theme", theme);
  }, [theme]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: setLangState,
    t: (k) => dict[lang][k] ?? String(k),
    dir: lang === "ar" ? "rtl" : "ltr",
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((p) => (p === "dark" ? "light" : "dark")),
    cart,
    addToCart: (i) =>
      setCart((c) => {
        const key = (x: CartItem) => `${x.id}__${x.variant ?? ""}`;
        const inKey = key(i as CartItem);
        const ex = c.find((x) => key(x) === inKey);
        if (ex) return c.map((x) => (key(x) === inKey ? { ...x, qty: x.qty + 1 } : x));
        return [...c, { ...i, qty: 1 }];
      }),
    removeFromCart: (id, variant) =>
      setCart((c) => c.filter((x) => !(x.id === id && (variant === undefined || x.variant === variant)))),
    clearCart: () => setCart([]),
    bookings,
    addBooking: (b) => setBookings((bs) => [...bs, { ...b, id: crypto.randomUUID() }]),
    cancelBooking: (id) => setBookings((bs) => bs.filter((b) => b.id !== id)),
    cartOpen, setCartOpen,
    merchantOpen, setMerchantOpen,
    assistantOpen, setAssistantOpen,
    customer, setCustomer: setCustomerState,
    sound, setSound: setSoundState,
  }), [lang, cart, bookings, cartOpen, merchantOpen, assistantOpen, customer, sound, theme]);

  return <SanadakCtx.Provider value={value}>{children}</SanadakCtx.Provider>;
}

export function useSanadak() {
  const c = useContext(SanadakCtx);
  if (!c) throw new Error("useSanadak must be used within SanadakProvider");
  return c;
}
