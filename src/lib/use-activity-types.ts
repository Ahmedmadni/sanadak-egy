import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateCategoryConfig, type CategoryConfig } from "@/components/business/types";

let loaded = false;

export function useLoadActivityTypes() {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    (async () => {
      const { data } = await supabase.from("activity_types" as any).select("*").eq("is_active", true).order("sort_order");
      const rows = (data as any[]) ?? [];
      if (rows.length === 0) return;
      const map: Record<string, CategoryConfig> = {};
      rows.forEach((r) => {
        map[r.code] = {
          labelAr: r.label_ar, labelEn: r.label_en, catalogKind: r.catalog_kind,
          catalogLabelAr: r.catalog_label_ar, catalogLabelEn: r.catalog_label_en,
          staffLabelAr: r.staff_label_ar, staffLabelEn: r.staff_label_en,
          hasOrders: r.has_orders, hasBookings: r.has_bookings,
          usesVariants: r.uses_variants, usesStock: r.uses_stock,
          usesDuration: r.uses_duration, usesBarcode: r.uses_barcode ?? false,
        };
      });
      hydrateCategoryConfig(map);
    })();
  }, []);
}
