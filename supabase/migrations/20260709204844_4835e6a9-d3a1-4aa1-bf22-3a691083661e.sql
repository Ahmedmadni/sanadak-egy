
-- =========================================================
-- Phase 3 (remainder): real electronic payment collection via Paymob.
-- Manual bank transfer / Vodafone Cash + receipt review stays as a
-- fallback path; this adds a "pay online now" path alongside it.
-- =========================================================

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_provider text; -- 'paymob' | 'manual'
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider_transaction_id text;

-- Tracks a payment attempt from the moment we create a Paymob order until
-- the webhook confirms (or the user abandons) it. The edge functions run
-- with the service role and bypass RLS for writes; these policies only
-- govern what the tenant/admin can read back client-side.
CREATE TABLE public.payment_intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'paymob',
  provider_order_id text,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending', -- pending | paid | failed | expired
  raw_webhook jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_intentions_tenant_idx ON public.payment_intentions(tenant_id);
CREATE INDEX payment_intentions_provider_order_idx ON public.payment_intentions(provider_order_id);
GRANT SELECT ON public.payment_intentions TO authenticated;
GRANT ALL ON public.payment_intentions TO service_role;
ALTER TABLE public.payment_intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own payment intentions" ON public.payment_intentions FOR SELECT TO authenticated
  USING (private.is_tenant_member(auth.uid(), tenant_id, 'owner') OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER payment_intentions_updated BEFORE UPDATE ON public.payment_intentions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
