
-- =========================================================
-- Phase 4: activity types become data, not code — admins can
-- add a new business category without a code deploy. Seeded
-- with today's 8 hardcoded categories so behavior is unchanged.
-- =========================================================
CREATE TABLE public.activity_types (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  catalog_kind text NOT NULL DEFAULT 'product', -- product | service | package | menu_item
  catalog_label_ar text NOT NULL,
  catalog_label_en text NOT NULL,
  staff_label_ar text NOT NULL DEFAULT 'الفريق',
  staff_label_en text NOT NULL DEFAULT 'Staff',
  has_orders boolean NOT NULL DEFAULT true,
  has_bookings boolean NOT NULL DEFAULT false,
  uses_variants boolean NOT NULL DEFAULT false,
  uses_stock boolean NOT NULL DEFAULT false,
  uses_duration boolean NOT NULL DEFAULT false,
  uses_barcode boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_types TO anon, authenticated;
GRANT ALL ON public.activity_types TO service_role;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active activity types" ON public.activity_types FOR SELECT TO anon, authenticated
  USING (is_active = true);
CREATE POLICY "Admins manage activity types" ON public.activity_types FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER activity_types_updated BEFORE UPDATE ON public.activity_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.activity_types (code, label_ar, label_en, catalog_kind, catalog_label_ar, catalog_label_en, staff_label_ar, staff_label_en, has_orders, has_bookings, uses_variants, uses_stock, uses_duration, uses_barcode, sort_order) VALUES
  ('restaurants', 'مطعم',            'Restaurant',        'menu_item', 'قائمة الطعام',        'Menu',                'الفريق',    'Staff',    true,  true,  true,  false, false, false, 1),
  ('cafes',       'كافيه',           'Café',              'menu_item', 'قائمة المشروبات',     'Menu',                'الفريق',    'Staff',    true,  true,  true,  false, false, false, 2),
  ('shops',       'متجر',            'Shop',              'product',   'المنتجات',            'Products',            'الفريق',    'Staff',    true,  false, true,  true,  false, true,  3),
  ('super',       'سوبرماركت',       'Supermarket',       'product',   'المنتجات',            'Products',            'الفريق',    'Staff',    true,  false, false, true,  false, true,  4),
  ('pharmacy',    'صيدلية',          'Pharmacy',          'product',   'المنتجات',            'Products',            'الفريق',    'Staff',    true,  false, false, true,  false, true,  5),
  ('halls',       'قاعة أفراح',      'Wedding hall',      'package',   'الباقات والأسعار',    'Packages & pricing',  'الفريق',    'Staff',    false, true,  false, false, true,  false, 6),
  ('medical',     'عيادة / مستشفى',  'Clinic / Hospital', 'service',   'الخدمات والكشوفات',   'Services',            'الأطباء',   'Doctors',  false, true,  false, false, true,  false, 7),
  ('salon',       'صالون',           'Salon',             'service',   'الخدمات',             'Services',            'فريق العمل','Staff',    false, true,  false, false, true,  false, 8);

-- =========================================================
-- Barcode + unit of measure for product-based categories
-- =========================================================
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS unit_label text; -- e.g. قطعة / كيلو / علبة
