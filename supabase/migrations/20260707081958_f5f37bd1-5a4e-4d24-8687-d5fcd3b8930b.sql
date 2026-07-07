
-- =========================================================
-- Phase 3: unified onboarding — legal documents, payment
-- receipts, and explicit payment verification before approval.
-- =========================================================

-- Track admin payment verification per subscription period (not per tenant,
-- since it should be re-confirmed on every renewal).
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method text; -- bank_transfer | vodafone_cash
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_reference text; -- transaction/reference number the merchant typed in

-- =========================================================
-- TENANT DOCUMENTS (legal papers + payment receipts)
-- =========================================================
CREATE TABLE public.tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL, -- commercial_register | owner_id | activity_license | payment_receipt
  file_path text NOT NULL, -- path inside the tenant-documents storage bucket
  note text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_documents_tenant_idx ON public.tenant_documents(tenant_id);
GRANT SELECT, INSERT ON public.tenant_documents TO authenticated;
GRANT UPDATE ON public.tenant_documents TO authenticated;
GRANT ALL ON public.tenant_documents TO service_role;
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own tenant documents" ON public.tenant_documents FOR SELECT TO authenticated
  USING (private.is_tenant_member(auth.uid(), tenant_id, 'manager') OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members upload tenant documents" ON public.tenant_documents FOR INSERT TO authenticated
  WITH CHECK (private.is_tenant_member(auth.uid(), tenant_id, 'manager') AND uploaded_by = auth.uid());
CREATE POLICY "Admins moderate tenant documents" ON public.tenant_documents FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- STORAGE: tenant media (public) + tenant documents (private)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-media', 'tenant-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention for both buckets: {tenant_id}/{filename}
CREATE POLICY "Public reads tenant media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tenant-media');

CREATE POLICY "Members upload tenant media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-media'
    AND private.is_tenant_member(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manager')
  );

CREATE POLICY "Members update tenant media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-media' AND private.is_tenant_member(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manager'));

CREATE POLICY "Members delete tenant media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-media' AND private.is_tenant_member(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manager'));

CREATE POLICY "Members read own tenant documents" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND (
      private.is_tenant_member(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manager')
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Members upload tenant documents to storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND private.is_tenant_member(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manager')
  );

-- =========================================================
-- Let a tenant owner record how/where they paid, without granting a
-- blanket UPDATE policy on subscriptions (which would also expose
-- payment_verified_at / status to direct client writes).
-- =========================================================
CREATE OR REPLACE FUNCTION public.submit_payment_info(_tenant uuid, _method text, _reference text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_tenant_member(auth.uid(), _tenant, 'owner') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.subscriptions
  SET payment_method = _method, payment_reference = _reference
  WHERE tenant_id = _tenant
    AND id = (SELECT id FROM public.subscriptions WHERE tenant_id = _tenant ORDER BY current_period_end DESC LIMIT 1);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_payment_info(uuid, text, text) TO authenticated;
