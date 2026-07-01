export type TenantRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  area: string | null;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  cover_url: string | null;
  owner_id: string | null;
  plan_id: string | null;
  status: string;
  verified_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
};

export type TenantWithRole = TenantRow & { role: "owner" | "manager" | "employee" };

export type BranchRow = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  hours: Record<string, unknown>;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  created_at: string;
};

export type StaffRow = {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  user_id: string | null;
  name: string;
  role: string | null;
  specialty: string | null;
  schedule: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

export type CatalogItemRow = {
  id: string;
  tenant_id: string;
  kind: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  category: string | null;
  variants: unknown[];
  stock: number | null;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type BookingRow = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  item_id: string | null;
  staff_id: string | null;
  branch_id: string | null;
  slot_start: string;
  slot_end: string | null;
  status: string;
  notes: string | null;
  serial_no: number;
  created_at: string;
};

export type OrderRow = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  delivery_type: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  status: string;
  payment_status: string;
  notes: string | null;
  serial_no: number;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  rating: number;
  body: string | null;
  is_approved: boolean;
  created_at: string;
};

export type PlanRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  price_monthly: number;
  currency: string;
  limits: { products?: number; branches?: number; staff?: number };
  features: { analytics?: boolean; delivery?: boolean; ai_studio?: boolean; api?: boolean; advanced_ai?: boolean };
  ai_quota_monthly: number;
  commission_rate?: number;
  sort_order: number;
  is_active: boolean;
};

export type SubscriptionRow = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
};

export type NotificationRow = {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type AiUsageRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  feature: string;
  tokens: number;
  cost: number;
  period_month: string;
  created_at: string;
};

export type CategoryConfig = {
  labelAr: string;
  labelEn: string;
  catalogKind: "menu_item" | "product" | "package" | "service";
  catalogLabelAr: string;
  catalogLabelEn: string;
  staffLabelAr: string;
  staffLabelEn: string;
  hasOrders: boolean;
  hasBookings: boolean;
  usesVariants: boolean;
  usesStock: boolean;
  usesDuration: boolean;
};

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  restaurants: {
    labelAr: "مطعم", labelEn: "Restaurant", catalogKind: "menu_item",
    catalogLabelAr: "قائمة الطعام", catalogLabelEn: "Menu",
    staffLabelAr: "الفريق", staffLabelEn: "Staff",
    hasOrders: true, hasBookings: true, usesVariants: true, usesStock: false, usesDuration: false,
  },
  cafes: {
    labelAr: "كافيه", labelEn: "Café", catalogKind: "menu_item",
    catalogLabelAr: "قائمة المشروبات", catalogLabelEn: "Menu",
    staffLabelAr: "الفريق", staffLabelEn: "Staff",
    hasOrders: true, hasBookings: true, usesVariants: true, usesStock: false, usesDuration: false,
  },
  shops: {
    labelAr: "متجر", labelEn: "Shop", catalogKind: "product",
    catalogLabelAr: "المنتجات", catalogLabelEn: "Products",
    staffLabelAr: "الفريق", staffLabelEn: "Staff",
    hasOrders: true, hasBookings: false, usesVariants: true, usesStock: true, usesDuration: false,
  },
  super: {
    labelAr: "سوبرماركت", labelEn: "Supermarket", catalogKind: "product",
    catalogLabelAr: "المنتجات", catalogLabelEn: "Products",
    staffLabelAr: "الفريق", staffLabelEn: "Staff",
    hasOrders: true, hasBookings: false, usesVariants: false, usesStock: true, usesDuration: false,
  },
  pharmacy: {
    labelAr: "صيدلية", labelEn: "Pharmacy", catalogKind: "product",
    catalogLabelAr: "المنتجات", catalogLabelEn: "Products",
    staffLabelAr: "الفريق", staffLabelEn: "Staff",
    hasOrders: true, hasBookings: false, usesVariants: false, usesStock: true, usesDuration: false,
  },
  halls: {
    labelAr: "قاعة أفراح", labelEn: "Wedding hall", catalogKind: "package",
    catalogLabelAr: "الباقات والأسعار", catalogLabelEn: "Packages & pricing",
    staffLabelAr: "الفريق", staffLabelEn: "Staff",
    hasOrders: false, hasBookings: true, usesVariants: false, usesStock: false, usesDuration: true,
  },
  medical: {
    labelAr: "عيادة / مستشفى", labelEn: "Clinic / Hospital", catalogKind: "service",
    catalogLabelAr: "الخدمات والكشوفات", catalogLabelEn: "Services",
    staffLabelAr: "الأطباء", staffLabelEn: "Doctors",
    hasOrders: false, hasBookings: true, usesVariants: false, usesStock: false, usesDuration: true,
  },
  salon: {
    labelAr: "صالون", labelEn: "Salon", catalogKind: "service",
    catalogLabelAr: "الخدمات", catalogLabelEn: "Services",
    staffLabelAr: "فريق العمل", staffLabelEn: "Staff",
    hasOrders: false, hasBookings: true, usesVariants: false, usesStock: false, usesDuration: true,
  },
};

export function categoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.shops;
}
