
-- store_requests table
CREATE TABLE public.store_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  owner_name text,
  phone text,
  category text NOT NULL,
  area text,
  description text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_requests TO authenticated;
GRANT INSERT ON public.store_requests TO anon;
GRANT ALL ON public.store_requests TO service_role;

ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a request" ON public.store_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view requests" ON public.store_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Submitters view their own request" ON public.store_requests
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "Admins update requests" ON public.store_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete requests" ON public.store_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_store_requests_updated
BEFORE UPDATE ON public.store_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin visibility to profiles + roles
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
