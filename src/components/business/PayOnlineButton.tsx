import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";

export function PayOnlineButton({ tenantId }: { tenantId: string }) {
  const { lang } = useSanadak();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", { body: { tenant_id: tenantId } });
      if (error) throw error;
      if (!data?.checkout_url) throw new Error(data?.error || (lang === "ar" ? "تعذّر بدء عملية الدفع" : "Could not start checkout"));
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <button type="button" disabled={busy} onClick={pay}
      className="h-11 px-4 rounded-xl border border-[var(--emerald)] text-[var(--emerald)] text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[var(--emerald)]/5">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {lang === "ar" ? "ادفع الآن إلكترونياً (بطاقة)" : "Pay online now (card)"}
    </button>
  );
}
